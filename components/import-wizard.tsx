"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { apiFetch } from "@/lib/backend"

// NEW: mode-aware field defs & types
import {
  FIELD_DEFS_BY_MODE,
  guessMappingFromHeaders,
  type MappingItem,
  type MappingPayload,
  type FieldDef
} from "@/lib/importFieldDefs"

type Mode = "products" | "customers" | "apis" | "others"

const JOBS_ENABLED = process.env.NEXT_PUBLIC_B2B_ENABLE_JOBS === "1"

// unchanged
async function uploadCsvDirect(jobId: string, file: File) {
  if (!file) throw new Error("No file selected")
  const fd = new FormData()
  fd.append("file", file)

  const res = await apiFetch(`/jobs/${jobId}/upload`, {
    method: "POST",
    body: fd,
  })
  return res
}

// CSV helpers (unchanged)
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
async function parseCsvSample(file: File, maxRows = 25) {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(l => l.length)
  if (!lines.length) return { headers: [] as string[], rows: [] as string[][] }
  const headers = splitCsvLine(lines[0])
  const rows: string[][] = []
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) rows.push(splitCsvLine(lines[i]))
  return { headers, rows }
}

// robust JSON reader (unchanged)
async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("application/json")) return res.json()
  const text = await res.text()
  throw new Error(text || `${res.status} ${res.statusText}`)
}

type ImportWizardProps = { onComplete?: (jobId: string) => void }

export default function ImportWizard({ onComplete = () => {} }: ImportWizardProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = React.useState<File | null>(null)

  // NEW: mapping is typed per-field
  const [mapping, setMapping] = React.useState<Record<string, MappingItem>>({})
  const [uploading, setUploading] = React.useState(false)
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState(0)

  // FIX: "apis" spelling + strong union
  const [mode, setMode] = React.useState<Mode>("products")

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<string[][]>([])
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)

  // derived: field defs for current mode
  const fieldDefs: FieldDef[] = React.useMemo(() => {
    return mode === "products" || mode === "customers" ? FIELD_DEFS_BY_MODE[mode] : FIELD_DEFS_BY_MODE["products"]
  }, [mode])

  // Poll job status (unchanged)
  React.useEffect(() => {
    let t: any
    if (step === 4 && jobId) {
      const poll = async () => {
        const res = await apiFetch(`/jobs/${jobId}`)
        if (!res.ok) return
        const data = await res.json()
        setProgress(data.progressPct ?? data.progress ?? 0)
        if (data.status === "completed" || data.status === "failed") {
          onComplete(jobId)
          clearInterval(t)
        }
      }
      t = setInterval(poll, 1000)
      poll()
    }
    return () => clearInterval(t)
  }, [step, jobId, onComplete])

  // compute whether required fields are mapped
  const missingRequired = React.useMemo(() => {
    return fieldDefs
      .filter(d => d.required && (mode === "products" || mode === "customers"))
      .some(d => !mapping[d.key]?.column)
  }, [fieldDefs, mapping, mode])

  const startImport = async () => {
    if (!JOBS_ENABLED) {
      setStatusMsg("Jobs and ingestion are temporarily disconnected in this phase.")
      return
    }
    if (!file) return
    if (mode !== "products" && mode !== "customers") {
      setStatusMsg("Only Products or Customers imports are supported right now.")
      return
    }
    if (missingRequired) {
      setStatusMsg("Please map all required fields before starting.")
      return
    }
    setUploading(true)
    setStatusMsg("Creating job...")
    try {
      // 1) create job
      const r = await apiFetch(`/jobs?mode=${mode}`, { method: "POST" })
      if (!r.ok) throw new Error(`Init failed (${r.status})`)
      const { jobId, bucket, path } = await r.json()
      setJobId(jobId)

      setStep(4)
      setProgress(5)
      setStatusMsg("Job created. Uploading CSV...")

      // 2) upload CSV
      const upRes = await uploadCsvDirect(jobId, file)
      if (!upRes.ok) {
        const txt = await upRes.text().catch(() => "")
        throw new Error(txt || `Upload failed (${upRes.status})`)
      }
      const { bucket: ub, path: upath } = await readJsonSafe(upRes).catch(() => ({ bucket, path }))
      setProgress(35)
      setStatusMsg(`CSV uploaded to ${ub}/${upath}. Starting processing...`)

      // 3) start job with typed mapping payload
      const payload: MappingPayload = { mode, fields: mapping }
      const kick = await apiFetch(`/jobs/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: payload }),
      })
      if (!kick.ok) {
        const txt = await kick.text().catch(() => "")
        throw new Error(txt || `Start failed (${kick.status})`)
      }
      setProgress(50)
      setStatusMsg("Job queued. Processing has started...")
    } catch (e: any) {
      setStatusMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setUploading(false)
    }
  }

  // When file drops/changes, parse headers and auto-map for current mode
  async function onPick(f: File | null) {
    setStatusMsg(null)
    setFile(f)
    if (f) {
      const { headers, rows } = await parseCsvSample(f, 25)
      setHeaders(headers)
      setRows(rows)
      if (mode === "products" || mode === "customers") {
        setMapping(guessMappingFromHeaders(headers, FIELD_DEFS_BY_MODE[mode]))
      } else {
        setMapping({})
      }
    } else {
      setHeaders([]); setRows([]); setMapping({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setStep(1) }}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={!JOBS_ENABLED} title={!JOBS_ENABLED ? "Temporarily disconnected" : undefined}>
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="xl:max-w-[1200px] w-[98vw] p-0 overflow-auto max-h-[92vh]">
        <div className="flex max-h-[82vh] min-h-[65vh] flex-col">
          {/* HEADER */}
          <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
            <DialogHeader className="p-0">
              <DialogTitle>CSV Import</DialogTitle>
            </DialogHeader>
            <div className="mt-2"><StepHeader step={step} /></div>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-auto px-6 py-4 min-h-0">

            {/* ---- Step 1 ---- */}
            {step === 1 && (
              <div className="space-y-3">
                {!JOBS_ENABLED && (
                  <div className="rounded-md border bg-muted/40 text-sm px-3 py-2">
                    Jobs and ingestion are temporarily disconnected. UI is kept for upcoming changes.
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Label className="min-w-24">Import type</Label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="products">Products</option>
                    <option value="customers">Customers</option>
                    <option value="apis">API</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <Label>Upload CSV</Label>
                <div
                  className="rounded-lg border border-dashed p-6 h-48 flex flex-col items-center justify-center text-sm text-muted-foreground hover:bg-muted/40 transition-colors text-center"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0] ?? null
                    onPick(f)
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={async (e) => onPick(e.target.files?.[0] ?? null)}
                  />
                  {file
                    ? <div className="text-left"><div className="font-medium">{file.name}</div><div className="text-xs">{`${(file.size/1024).toFixed(1)} KB`}</div></div>
                    : "Drag & drop CSV here or click to select"}
                </div>
              </div>
            )}

            {/* ---- Step 2: MODE-AWARE MAP ---- */}
            {step === 2 && (
              <div className="space-y-3">
                <Label className="mb-2">Map Fields</Label>
                <div className="rounded border p-3 text-sm">
                  {headers.length === 0 ? (
                    <div className="text-muted-foreground">Upload a CSV to detect headers.</div>
                  ) : (
                    <>
                      <div className="mb-2 text-muted-foreground">
                        {missingRequired
                          ? <span className="text-red-600">Map all required fields (marked *)</span>
                          : "Auto-mapped suggestions filled in. You can change them below."}
                      </div>

                      {/* Scrollable grid */}
                      <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-auto pr-1">
                        {fieldDefs.map(def => {
                          const sel = mapping[def.key] || { type: def.type, optional: !def.required, delimiter: def.type === "array" ? def.delimiter || "|" : undefined }
                          return (
                            <div key={def.key} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <div className="text-xs uppercase text-muted-foreground">
                                  {def.label}{def.required && <span className="text-red-600"> *</span>}
                                </div>
                                {!def.required && (
                                  <label className="text-xs flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={!!sel.optional}
                                      onChange={(e) => setMapping(m => ({ ...m, [def.key]: { ...sel, optional: e.target.checked } }))}
                                    />
                                    Skip if missing
                                  </label>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  className="border rounded px-2 py-1 text-sm flex-1"
                                  value={sel.column ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value || undefined
                                    setMapping(m => ({ ...m, [def.key]: { ...sel, column: v } }))
                                  }}
                                >
                                  <option value="">—</option>
                                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>

                                {def.type === "array" && (
                                  <input
                                    className="w-16 border rounded px-1 py-1 text-xs"
                                    value={sel.delimiter || "|"}
                                    onChange={(e) => setMapping(m => ({ ...m, [def.key]: { ...sel, delimiter: e.target.value } }))}
                                    title="Delimiter"
                                  />
                                )}
                              </div>

                              {def.help && <div className="text-[11px] text-muted-foreground">{def.help}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---- Step 3 ---- */}
            {step === 3 && (
              <div className="space-y-3">
                <Label>Review &amp; Import</Label>
                {rows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No rows to preview.</div>
                ) : (
                  <div className="mx-auto w-[86%] max-w-[900px] rounded-md border bg-background/50 shadow-sm">
                    <div className="max-h-[50vh] w-full overflow-auto">
                      <table className="min-w-[1400px] table-fixed border-collapse text-sm">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr>{headers.map(h => <th key={h} className="px-2 py-2 text-left font-semibold border-b whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 50).map((r, i) => (
                            <tr key={i} className="border-t odd:bg-background even:bg-muted/20">
                              {headers.map((_, j) => <td key={j} className="px-2 py-2 align-top break-words">{r[j] ?? ""}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <Separator />
              </div>
            )}

            {/* ---- Step 4 ---- */}
            {step === 4 && (
              <div className="space-y-3">
                <Label>Import Progress</Label>
                {statusMsg && <div className="rounded-md border bg-muted/40 text-sm px-3 py-2">{statusMsg}</div>}
                <Progress value={progress} />
                <div className="text-sm text-muted-foreground">{progress}%</div>
                <div className="text-xs text-muted-foreground">
                  You can close this dialog; the job keeps running. Check the Jobs page for details.
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 z-10 border-t bg-background px-6 py-3 flex justify-end gap-2">
            {step === 1 && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!file}>Next</Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={missingRequired}>Next</Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={startImport} disabled={uploading || !file || missingRequired}>
                  {uploading ? "Starting..." : "Start Import"}
                </Button>
              </>
            )}
            {step === 4 && (
              <Button onClick={() => setOpen(false)} disabled={progress < 100}>Close</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepHeader({ step = 1 as 1 | 2 | 3 | 4 }) {
  const steps = ["Upload", "Map", "Review", "Import"]
  return (
    <div className="flex items-center justify-between text-xs">
      {steps.map((s, i) => {
        const idx = i + 1
        const active = idx === step
        const done = idx < step
        return (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? "bg-emerald-600 text-white" : active ? "bg-emerald-200 text-emerald-900" : "bg-muted text-muted-foreground"}`}>
              {idx}
            </div>
            <div className={`${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</div>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}
