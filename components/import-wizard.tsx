"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { apiFetch } from "@/lib/backend"

type Mode = "products" | "customers"

// ────────────────────────────────────────────────────────────────
// CSV preview helper
// ────────────────────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = "", inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
    } else if (ch === "," && !inQ) {
      out.push(cur); cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

function parseCsvPreview(text: string, maxRows = 5) {
  const lines = text.split(/\r?\n/).filter(l => l.length)
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][], totalRows: 0 }
  const headers = splitCsvLine(lines[0])
  const rows: string[][] = []
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) rows.push(splitCsvLine(lines[i]))
  return { headers, rows, totalRows: lines.length - 1 }
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

type ImportWizardProps = { onComplete?: (runId: string) => void }

export default function ImportWizard({ onComplete = () => { } }: ImportWizardProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [mode, setMode] = React.useState<Mode>("products")

  // Preview state
  const [preview, setPreview] = React.useState<{
    headers: string[]; rows: string[][]; totalRows: number
  } | null>(null)
  const [showPreview, setShowPreview] = React.useState(false)

  // Upload / progress state
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)
  const [runId, setRunId] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Poll orchestration run status ──
  React.useEffect(() => {
    let t: ReturnType<typeof setInterval>
    if (step === 2 && runId && !done) {
      const poll = async () => {
        try {
          const res = await apiFetch(`/api/v1/ingest/status/${runId}`)
          if (!res.ok) return
          const data = await res.json()
          const pct = data.progress_pct ?? 0
          setProgress(Math.max(progress, 50 + Math.round(pct / 2))) // 50-100 range for orchestration phase
          if (data.status === "completed" || data.status === "failed") {
            setProgress(data.status === "completed" ? 100 : progress)
            setStatusMsg(
              data.status === "completed"
                ? `✅ Import completed — ${data.bronze_records ?? 0} records processed through the data pipeline.`
                : `❌ Import failed — please check the orchestration logs.`
            )
            setDone(true)
            onComplete(runId)
            clearInterval(t)
          }
        } catch {
          // ignore transient poll errors
        }
      }
      t = setInterval(poll, 3000)
      poll()
    }
    return () => clearInterval(t)
  }, [step, runId, done, onComplete, progress])

  // ── Handle file selection ──
  async function onPick(f: File | null) {
    setStatusMsg(null)
    setFile(f)
    setShowPreview(false)
    if (f) {
      // Read just enough for preview (first 64KB is plenty for 5 rows)
      const slice = f.slice(0, 65536)
      const text = await slice.text()
      setPreview(parseCsvPreview(text, 5))
    } else {
      setPreview(null)
    }
  }

  // ── Start import: upload CSV to Supabase Storage → trigger orchestrator ──
  const startImport = async () => {
    if (!file) return
    setUploading(true)
    setStep(2)
    setProgress(5)
    setStatusMsg("Requesting upload URL...")

    try {
      // 1) Get signed upload URL from backend
      const initRes = await apiFetch("/api/v1/ingest/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, source_name: "csv_upload" }),
      })
      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => "")
        throw new Error(errText || `Failed to initiate upload (${initRes.status})`)
      }
      const initData = await initRes.json()
      const { upload, ingestion_run_id } = initData
      // Defensive: validate expected response shape
      if (!upload?.url || !ingestion_run_id) {
        throw new Error("Unexpected response from server — missing upload URL or run ID")
      }
      // upload: { url, token, bucket, path }

      setProgress(15)
      setStatusMsg(`Uploading ${file.name} (${(file.size / 1024).toFixed(0)} KB)...`)

      // 2) Upload CSV directly to Supabase Storage via the signed URL
      const uploadRes = await fetch(upload.url, {
        method: "PUT",
        headers: {
          "Content-Type": "text/csv",
          ...(upload.token ? { Authorization: `Bearer ${upload.token}` } : {}),
        },
        body: file,
      })
      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed (${uploadRes.status})`)
      }

      setProgress(45)
      setStatusMsg("CSV stored. Triggering data pipeline...")

      // 3) Tell backend to trigger the orchestrator
      const completeRes = await apiFetch("/api/v1/ingest/csv/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: ingestion_run_id,
          bucket: upload.bucket,
          path: upload.path,
          mode,
        }),
      })
      if (!completeRes.ok) {
        const errText = await completeRes.text().catch(() => "")
        throw new Error(errText || `Failed to trigger pipeline (${completeRes.status})`)
      }
      const completeData = await completeRes.json()
      const finalRunId = completeData.run_id || completeData.ingestion_run_id || ingestion_run_id
      setRunId(finalRunId)

      if (completeData.orchestrator_reached === false) {
        // Orchestrator not running — CSV is stored, run recorded as pending
        setProgress(100)
        setStatusMsg(
          "✅ CSV uploaded and stored successfully. " +
          "The data pipeline is not currently running — your import has been " +
          "queued and will be processed automatically when the pipeline comes online."
        )
        setDone(true)
        onComplete(finalRunId)
      } else {
        setProgress(50)
        setStatusMsg("Pipeline triggered. Processing records...")
      }

    } catch (e: any) {
      setStatusMsg(`Error: ${e?.message || String(e)}`)
      setDone(true)
    } finally {
      setUploading(false)
    }
  }

  // Reset state on dialog close
  const handleClose = () => {
    setOpen(false)
    setStep(1)
    setFile(null)
    setPreview(null)
    setShowPreview(false)
    setProgress(0)
    setStatusMsg(null)
    setRunId(null)
    setDone(false)
    setUploading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="secondary">Import</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-auto max-h-[85vh]">
        <div className="flex flex-col min-h-[340px]">
          {/* HEADER */}
          <div className="border-b px-6 py-4">
            <DialogHeader className="p-0">
              <DialogTitle>CSV Import</DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <StepDot n={1} active={step === 1} done={step > 1} />
              <span className={step === 1 ? "font-medium text-foreground" : ""}>Upload</span>
              <div className="h-px flex-1 bg-border" />
              <StepDot n={2} active={step === 2} done={done && !statusMsg?.startsWith("❌")} />
              <span className={step === 2 ? "font-medium text-foreground" : ""}>Import</span>
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-auto px-6 py-5">

            {/* ── Step 1: Upload ── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="flex items-center gap-3">
                  <Label className="min-w-24">Import type</Label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                    className="border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="products">Products</option>
                    <option value="customers">Customers</option>
                  </select>
                </div>

                {/* Drop zone */}
                <div
                  className="rounded-lg border border-dashed p-6 h-40 flex flex-col items-center justify-center text-sm text-muted-foreground hover:bg-muted/40 transition-colors text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null) }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={async (e) => onPick(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="text-left">
                      <div className="font-medium text-foreground">{file.name}</div>
                      <div className="text-xs">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 mb-2 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <span>Drag &amp; drop CSV here or click to select</span>
                    </>
                  )}
                </div>

                {/* Inline preview (collapsed) */}
                {preview && preview.rows.length > 0 && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? "Hide preview" : `Preview (${preview.totalRows} rows detected)`}
                    </button>
                    {showPreview && (
                      <div className="rounded-md border bg-muted/20 overflow-auto max-h-[180px]">
                        <table className="text-xs w-full border-collapse">
                          <thead className="bg-muted sticky top-0">
                            <tr>{preview.headers.map(h => <th key={h} className="px-2 py-1 text-left font-medium border-b whitespace-nowrap">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((r, i) => (
                              <tr key={i} className="border-t">
                                {preview.headers.map((_, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{r[j] ?? ""}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  The data pipeline will automatically detect your column headers and map them to the correct fields.
                </p>
              </div>
            )}

            {/* ── Step 2: Progress ── */}
            {step === 2 && (
              <div className="space-y-4">
                <Label>Import Progress</Label>
                <Progress value={progress} className="h-2" />
                <div className="text-sm font-medium">{progress}%</div>
                {statusMsg && (
                  <div className={`rounded-md border px-3 py-2 text-sm ${statusMsg.startsWith("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                    statusMsg.startsWith("❌") ? "bg-red-50 border-red-200 text-red-800" :
                      statusMsg.startsWith("Error") ? "bg-red-50 border-red-200 text-red-800" :
                        "bg-muted/40"
                    }`}>
                    {statusMsg}
                  </div>
                )}
                {!done && (
                  <p className="text-xs text-muted-foreground">
                    Your CSV is being stored and processed through the data pipeline (PreBronze → Bronze → Silver → Gold).
                    Column mapping is handled automatically.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t px-6 py-3 flex justify-end gap-2">
            {step === 1 && (
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={startImport} disabled={!file || uploading}>
                  Upload &amp; Import
                </Button>
              </>
            )}
            {step === 2 && (
              <Button onClick={handleClose} disabled={uploading && !done}>
                {done ? "Close" : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${done ? "bg-emerald-600 text-white" :
      active ? "bg-emerald-200 text-emerald-900" :
        "bg-muted text-muted-foreground"
      }`}>
      {done ? "✓" : n}
    </div>
  )
}
