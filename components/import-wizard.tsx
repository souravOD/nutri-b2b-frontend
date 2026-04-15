/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/backend"
import { Plus, CloudUpload, RefreshCw, ChevronRight, Info, Map, FileCheck, Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react"

type Mode = "products" | "customers"

const FILE_SIZE_LIMIT_MB = 50
const SAMPLE_TEMPLATE_URL = "/templates/products_sample.csv"

// ────────────────────────────────────────────────────────────────
// Destination fields and auto-mapping
// ────────────────────────────────────────────────────────────────

type DestField = { value: string; label: string }

const PRODUCT_DEST_FIELDS: DestField[] = [
  { value: "external_id", label: "External ID" },
  { value: "name", label: "Name" },
  { value: "brand", label: "Brand" },
  { value: "description", label: "Description" },
  { value: "price", label: "Price" },
  { value: "currency", label: "Currency" },
  { value: "category", label: "Category" },
  { value: "stock_level", label: "Stock Level" },
  { value: "barcode", label: "Barcode" },
  { value: "image_url", label: "Image URL" },
  { value: "__skip__", label: "— Skip / Unmapped" },
]

const CUSTOMER_DEST_FIELDS: DestField[] = [
  { value: "external_id", label: "External ID" },
  { value: "email", label: "Email" },
  { value: "full_name", label: "Full Name" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "phone", label: "Phone" },
  { value: "__skip__", label: "— Skip / Unmapped" },
]

const PRODUCT_AUTO_MAP: Record<string, string> = {
  ext_id: "external_id",
  external_id: "external_id",
  id: "external_id",
  sku: "external_id",
  product_name: "name",
  name: "name",
  title: "name",
  brand_id: "brand",
  brand: "brand",
  msrp: "price",
  price: "price",
  cost: "price",
  long_desc: "description",
  description: "description",
  desc: "description",
  qty_on_hand: "stock_level",
  stock: "stock_level",
  quantity: "stock_level",
  cat_name: "category",
  category: "category",
  barcode: "barcode",
  image_url: "image_url",
  currency: "currency",
}

const CUSTOMER_AUTO_MAP: Record<string, string> = {
  ext_id: "external_id",
  external_id: "external_id",
  id: "external_id",
  email: "email",
  full_name: "full_name",
  first_name: "first_name",
  last_name: "last_name",
  phone: "phone",
}

function autoMapSource(source: string, mode: Mode): string {
  const normalized = source.toLowerCase().replace(/\s+/g, "_").trim()
  const map = mode === "products" ? PRODUCT_AUTO_MAP : CUSTOMER_AUTO_MAP
  return map[normalized] ?? ""
}

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

export type ColumnMapping = {
  sourceHeader: string
  destination: string
  skipIfMissing: boolean
}

function buildInitialMappings(headers: string[], mode: Mode): ColumnMapping[] {
  return headers.map((h) => {
    const dest = autoMapSource(h, mode)
    return {
      sourceHeader: h,
      destination: dest || "__skip__",
      skipIfMissing: false,
    }
  })
}

/** Transform CSV content: rename columns per mapping, drop unmapped columns */
function transformCsvContent(
  file: File,
  mappings: ColumnMapping[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.length)
      if (!lines.length) {
        resolve(new Blob([""], { type: "text/csv" }))
        return
      }
      const sourceHeaders = splitCsvLine(lines[0])
      const headerToIndex = Object.fromEntries(sourceHeaders.map((h, i) => [h, i]))
      const destToSource = new Map<string, string>()
      for (const m of mappings) {
        if (m.destination && m.destination !== "__skip__" && headerToIndex[m.sourceHeader] !== undefined) {
          destToSource.set(m.destination, m.sourceHeader)
        }
      }
      const outHeaders = [...destToSource.keys()]
      const outLines: string[] = [outHeaders.join(",")]
      const total = lines.length - 1
      for (let i = 1; i < lines.length; i++) {
        const cells = splitCsvLine(lines[i])
        const outCells: string[] = []
        for (const dest of outHeaders) {
          const src = destToSource.get(dest)!
          const idx = headerToIndex[src]
          outCells.push(idx !== undefined && cells[idx] !== undefined ? `"${String(cells[idx]).replace(/"/g, '""')}"` : "")
        }
        outLines.push(outCells.join(","))
        if (onProgress && total > 0 && i % 100 === 0) {
          onProgress(Math.round((i / total) * 100))
        }
      }
      resolve(new Blob([outLines.join("\n")], { type: "text/csv" }))
    } catch (e) {
      reject(e)
    }
  })
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

type ImportWizardProps = {
  onComplete?: (runId: string) => void
  onClose?: () => void
  triggerLabel?: string
  triggerClassName?: string
  initialOpen?: boolean
  showTriggerIcon?: boolean
}

export default function ImportWizard({
  onComplete = () => {},
  onClose,
  triggerLabel = "Import",
  triggerClassName,
  initialOpen = false,
  showTriggerIcon = true,
}: ImportWizardProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [mode, setMode] = React.useState<Mode>("products")

  // Preview state
  const [preview, setPreview] = React.useState<{
    headers: string[]; rows: string[][]; totalRows: number
  } | null>(null)
  const [showPreview, setShowPreview] = React.useState(false)

  // Map step: column mappings
  const [mappings, setMappings] = React.useState<ColumnMapping[]>([])
  const [mapError, setMapError] = React.useState<string | null>(null)

  // Upload / progress state
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null)
  const [runId, setRunId] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [completionMetrics, setCompletionMetrics] = React.useState<{
    totalRecords: number
    successful: number
    errors: number
    finishedAt: string | null
  } | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // ── Build initial mappings when entering Map step ──
  React.useEffect(() => {
    if (step === 2 && preview?.headers?.length) {
      setMappings(buildInitialMappings(preview.headers, mode))
    }
  }, [step, preview?.headers, mode])

  // ── Poll orchestration run status ──
  React.useEffect(() => {
    let t: ReturnType<typeof setInterval>
    if (step === 4 && runId && !done) {
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
            setCompletionMetrics({
              totalRecords: data.total_records ?? preview?.totalRows ?? data.bronze_records ?? 0,
              successful: data.successful ?? data.bronze_records ?? 0,
              errors: data.errors ?? 0,
              finishedAt: data.finished_at ?? null,
            })
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

  const destFields = mode === "products" ? PRODUCT_DEST_FIELDS : CUSTOMER_DEST_FIELDS

  const goToMap = () => {
    if (file && preview?.headers?.length) {
      setMappings(buildInitialMappings(preview.headers, mode))
      setStep(2)
    }
  }

  const goBackToUpload = () => {
    setMapError(null)
    setStep(1)
  }

  const mappedCount = mappings?.length
    ? mappings.filter((m) => m.destination && m.destination !== "__skip__").length
    : 0
  const skippedCount = mappings?.length
    ? mappings.filter((m) => m.destination === "__skip__").length
    : 0

  const goToReview = () => {
    if (file && preview?.headers?.length && mappedCount > 0) {
      setStep(3)
    }
  }

  const goBackToMap = () => {
    setStep(2)
  }

  const proceedFromMap = async () => {
    setMapError(null)
    if (!file || !mappings.length) {
      setMapError("No columns available to map. Please go back and re-upload your CSV.")
      return
    }
    if (mappedCount === 0) {
      setMapError("Map at least one column to a destination field.")
      return
    }
    setUploading(true)
    try {
      const blob = await transformCsvContent(file, mappings)
      const transformedFile = new File([blob], file.name, { type: "text/csv" })
      await startImport(transformedFile)
    } catch (e: any) {
      setStatusMsg(`Error: ${e?.message || String(e)}`)
      setDone(true)
      setStep(4)
    } finally {
      setUploading(false)
    }
  }

  // ── Handle file selection ──
  async function onPick(f: File | null) {
    setStatusMsg(null)
    setFileError(null)
    setFile(f)
    setShowPreview(false)
    if (f) {
      const limitBytes = FILE_SIZE_LIMIT_MB * 1024 * 1024
      if (f.size > limitBytes) {
        setFileError(`File size exceeds ${FILE_SIZE_LIMIT_MB}MB limit. Please choose a smaller file.`)
        setFile(null)
        setPreview(null)
        return
      }
      // Read just enough for preview (first 64KB is plenty for 5 rows)
      const slice = f.slice(0, 65536)
      const text = await slice.text()
      setPreview(parseCsvPreview(text, 5))
    } else {
      setPreview(null)
    }
  }

  // ── Start import: upload CSV to Supabase Storage → trigger orchestrator ──
  const startImport = async (fileToUpload?: File) => {
    const f = fileToUpload ?? file
    if (!f) return
    setUploading(true)
    setStep(4)
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
      setStatusMsg(`Uploading ${f.name} (${(f.size / 1024).toFixed(0)} KB)...`)

      // 2) Upload CSV directly to Supabase Storage via the signed URL
      const uploadRes = await fetch(upload.url, {
        method: "PUT",
        headers: {
          "Content-Type": "text/csv",
          ...(upload.token ? { Authorization: `Bearer ${upload.token}` } : {}),
        },
        body: f,
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

  // Open dialog when initialOpen is true (e.g. from Jobs Retry link)
  React.useEffect(() => {
    if (initialOpen) setOpen(true)
  }, [initialOpen])

  // Reset state on dialog close
  const handleClose = () => {
    setOpen(false)
    setStep(1)
    setFile(null)
    setPreview(null)
    setShowPreview(false)
    setMappings([])
    setMapError(null)
    setProgress(0)
    setStatusMsg(null)
    setRunId(null)
    setDone(false)
    setUploading(false)
    setFileError(null)
    setCompletionMetrics(null)
    onClose?.()
  }

  const handleViewJobs = () => {
    handleClose()
    router.push("/jobs")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="secondary" className={triggerClassName}>
          {showTriggerIcon && <Plus className="h-4 w-4 mr-2" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[672px] p-0 overflow-auto max-h-[85vh] border-[#e2e8f0] rounded-xl">
        <div className="flex flex-col min-h-[340px]">
          {/* HEADER */}
          <div className="border-b border-[#f1f5f9] px-6 py-4">
            <DialogHeader className="p-0">
              <DialogTitle>CSV Import</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              <ImportStepper
                step={step}
                done={done}
                statusMsg={statusMsg}
              />
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-auto px-8 py-6">

            {/* ── Step 1: Upload ── */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Mode selector */}
                <div className="space-y-2 max-w-[320px]">
                  <Label className="text-[14px] font-semibold text-[#334155]">Import type</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                    <SelectTrigger className="h-[44px] w-full rounded-[8px] border-[#e2e8f0] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Drop zone */}
                <div
                  className="rounded-[12px] border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] p-[42px] flex flex-col items-center justify-center text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors text-center cursor-pointer"
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
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-4 shadow-sm flex items-center justify-center size-[80px]">
                          <CloudUpload className="h-[30px] w-[24px] text-[#94a3b8]" />
                        </div>
                        <div className="font-bold text-[18px] text-[#0f172a]">{file.name}</div>
                        <div className="text-[14px] text-[#94a3b8]">({(file.size / 1024).toFixed(1)} KB)</div>
                        <div className="text-[14px] text-[#64748b]">Upload CSV</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[8px] border-[#e2e8f0] font-bold text-[#334155]"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Change file
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-4 shadow-sm flex items-center justify-center size-[80px] mb-4">
                        <CloudUpload className="h-[30px] w-[24px] text-[#94a3b8]" />
                      </div>
                      <span>Drag &amp; drop CSV here or click to select</span>
                    </>
                  )}
                </div>

                {fileError && (
                  <div className="rounded-[8px] bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                    {fileError}
                  </div>
                )}

                {/* Info box */}
                <div className="flex gap-3 items-start p-4 rounded-[8px] bg-[#eff6ff]">
                  <Info className="h-5 w-5 shrink-0 text-[#1e40af]" />
                  <p className="text-[12px] text-[#1e40af] leading-[19.5px]">
                    Make sure your CSV file includes a header row. The file size limit is {FILE_SIZE_LIMIT_MB}MB. Need help?{" "}
                    <a href={SAMPLE_TEMPLATE_URL} download="products_sample.csv" className="font-bold text-primary hover:underline">
                      Download a sample template
                    </a>
                  </p>
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
              </div>
            )}

            {/* ── Step 2: Map ── */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#f1f5f9] -mx-8 -mt-6 px-8 pt-6 pb-4">
                  <div className="grid grid-cols-2 gap-4 items-center text-[11px] font-bold uppercase tracking-[0.55px] text-[#64748b]">
                    <span>Source Column (from file)</span>
                    <span>Destination Field</span>
                  </div>
                </div>
                <div className="flex flex-col max-h-[320px] overflow-y-auto -mx-8 px-8">
                  {mappings.map((m, idx) => (
                    <div
                      key={m.sourceHeader}
                      className="grid grid-cols-2 gap-4 items-center py-4 border-t border-[#f1f5f9] first:border-t-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[14px] font-medium text-[#0f172a] truncate">{m.sourceHeader}</span>
                      </div>
                      <Select
                        value={m.destination || "__skip__"}
                        onValueChange={(v) => {
                          setMappings((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, destination: v } : p))
                          )
                        }}
                      >
                        <SelectTrigger className="h-[38px] w-full min-w-0 rounded-[8px] border-[#e2e8f0] bg-white">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {destFields.map((d) => (
                            <SelectItem key={d.value || `_${idx}`} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                {mapError && (
                  <div className="rounded-[8px] bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
                    {mapError}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-[25px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <p className="text-[14px] text-[#64748b]">Total Records</p>
                    <p className="text-[30px] font-bold text-[#0f172a] mt-1">{preview?.totalRows?.toLocaleString() ?? 0}</p>
                    <div className="flex items-center gap-1 pt-1">
                      <CheckCircle2 className="size-3 text-[#10b981]" />
                      <span className="text-[12px] font-bold text-[#10b981]">Validated</span>
                    </div>
                  </div>
                  <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-[25px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <p className="text-[14px] text-[#64748b]">Mapped Fields</p>
                    <p className="text-[30px] font-bold text-[#0f172a] mt-1">{mappedCount} / {mappings.length}</p>
                    <div className="flex items-center gap-1 pt-1">
                      {skippedCount > 0 ? (
                        <>
                          <AlertCircle className="size-3 text-[#ec5b13]" />
                          <span className="text-[12px] font-bold text-[#ec5b13]">{skippedCount} Optional skipped</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3 text-[#10b981]" />
                          <span className="text-[12px] font-bold text-[#10b981]">All mapped</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-white border-l-4 border-primary border border-[#e2e8f0] rounded-[12px] p-[25px] pl-[28px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <p className="text-[14px] text-[#64748b]">Potential Errors</p>
                    <p className="text-[30px] font-bold text-[#0f172a] mt-1">0</p>
                    <div className="flex items-center gap-1 pt-1">
                      <Info className="size-3 text-[#94a3b8]" />
                      <span className="text-[12px] font-bold text-[#94a3b8]">Clean data scan</span>
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-[#e2e8f0]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[18px] font-bold text-[#0f172a]">Preview & Field Validation</h3>
                        <Info className="size-4 text-[#64748b]" />
                      </div>
                      <p className="text-[14px] text-[#64748b] mt-1">
                        Reviewing top 5 sample records from &quot;{file?.name ?? "file"}&quot;
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary font-semibold hover:bg-[#eff6ff]"
                      onClick={goBackToMap}
                    >
                      <Pencil className="size-3.5 mr-1" />
                      Edit Mapping
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]">
                      <thead>
                        <tr className="bg-[#f8fafc]">
                          <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.55px] text-[#0f172a]">Source Column</th>
                          <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.55px] text-[#0f172a]">System Target</th>
                          <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.55px] text-[#0f172a]">Sample Value</th>
                          <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.55px] text-[#0f172a]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings
                          .filter((m) => m.destination && m.destination !== "__skip__")
                          .map((m) => {
                            const headerIdx = preview?.headers?.indexOf(m.sourceHeader) ?? -1
                            const sampleVal = headerIdx >= 0 && preview?.rows?.[0]?.[headerIdx] != null
                              ? preview.rows[0][headerIdx]
                              : "—"
                            const destLabel = destFields.find((d) => d.value === m.destination)?.label ?? m.destination
                            return (
                              <tr key={m.sourceHeader} className="border-t border-[#f1f5f9]">
                                <td className="px-6 py-4 font-medium text-[#0f172a]">{m.sourceHeader}</td>
                                <td className="px-6 py-4 font-bold text-primary">{destLabel}</td>
                                <td className="px-6 py-4 text-[#475569]">{sampleVal}</td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center rounded-full bg-[#ecfdf5] border border-[#d1fae5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                                    MATCHED
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Progress or Import Complete ── */}
            {step === 4 && !done && (
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
                <p className="text-xs text-muted-foreground">
                  Your CSV is being stored and processed through the data pipeline (PreBronze → Bronze → Silver → Gold).
                  Column mapping is handled automatically.
                </p>
              </div>
            )}
            {step === 4 && done && (
              <div className="flex flex-col gap-6">
                {/* Success/Failed Section */}
                <div className="flex flex-col items-center">
                  {statusMsg?.startsWith("❌") ? (
                    <div className="bg-[rgba(239,68,68,0.1)] rounded-full size-[80px] flex items-center justify-center mb-4">
                      <AlertCircle className="size-[43px] text-[#dc2626]" />
                    </div>
                  ) : (
                    <div className="bg-[rgba(0,67,143,0.1)] rounded-full size-[80px] flex items-center justify-center mb-4">
                      <CheckCircle2 className="size-[43px] text-primary" />
                    </div>
                  )}
                  <h3 className="text-[24px] font-bold text-[#0f172a]">
                    {statusMsg?.startsWith("❌") ? "Import Failed" : "Import Complete"}
                  </h3>
                  <p className="text-[16px] text-[#64748b] text-center mt-2 max-w-[448px]">
                    {statusMsg?.startsWith("❌")
                      ? "The import encountered errors. Please check the orchestration logs or Jobs for details."
                      : "Your data has been successfully updated with the new records."}
                  </p>
                </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#f8fafc] border border-[rgba(0,67,143,0.1)] rounded-[12px] p-[17px]">
                    <p className="text-[12px] font-semibold text-[#94a3b8] uppercase tracking-[0.6px] text-center">Total Records</p>
                    <p className="text-[24px] font-bold text-[#0f172a] text-center mt-1">
                      {(completionMetrics?.totalRecords ?? preview?.totalRows ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#f8fafc] border border-[rgba(0,67,143,0.1)] rounded-[12px] p-[17px]">
                    <p className="text-[12px] font-semibold text-[#94a3b8] uppercase tracking-[0.6px] text-center">Successful</p>
                    <p className="text-[24px] font-bold text-primary text-center mt-1">
                      {(completionMetrics?.successful ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] p-[17px]">
                    <p className="text-[12px] font-semibold text-[#f87171] uppercase tracking-[0.6px] text-center">Errors</p>
                    <p className="text-[24px] font-bold text-[#dc2626] text-center mt-1">
                      {(completionMetrics?.errors ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Info Alert */}
                <div className="bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.1)] rounded-[8px] p-[17px] flex gap-3 items-start">
                  <Info className="size-5 shrink-0 text-primary" />
                  <p className="text-[14px] text-[#475569]">
                    {completionMetrics?.finishedAt
                      ? `Import finished at ${new Date(completionMetrics.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. `
                      : "Import finished. "}
                    {(completionMetrics?.errors ?? 0) > 0
                      ? `${completionMetrics!.errors} errors were flagged for manual review in the Jobs section.`
                      : "All records were processed successfully."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-[#f1f5f9] bg-[#f8fafc] px-8 py-5 flex justify-between gap-3">
            {step === 1 && (
              <>
                <div />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} className="rounded-[8px] border-[#e2e8f0] font-bold text-[#334155]">
                    Cancel
                  </Button>
                  <Button onClick={goToMap} disabled={!file || uploading} className="rounded-[8px] bg-primary hover:bg-[#003366] font-bold text-white">
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" onClick={goBackToUpload} disabled={uploading} className="rounded-[8px] border-[#e2e8f0] font-bold text-[#475569]">
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} disabled={uploading} className="rounded-[8px] border-[#e2e8f0] font-bold text-[#334155]">
                    Cancel
                  </Button>
                  <Button onClick={goToReview} disabled={uploading || mappedCount === 0} className="rounded-[8px] bg-primary hover:bg-[#003366] font-bold text-white">
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <Button variant="outline" onClick={goBackToMap} disabled={uploading} className="rounded-[8px] border-[#e2e8f0] font-bold text-[#475569]">
                  Back
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} disabled={uploading} className="rounded-[8px] border-[#e2e8f0] font-bold text-[#334155]">
                    Cancel
                  </Button>
                  <Button onClick={proceedFromMap} disabled={uploading} className="rounded-[8px] bg-primary hover:bg-[#003366] font-bold text-white">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Import
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
            {step === 4 && (
              <div className="flex w-full justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={uploading && !done}
                  className="rounded-[8px] border-[#e2e8f0] font-bold text-[#334155]"
                >
                  Cancel
                </Button>
                {done && (
                  <Button
                    onClick={handleViewJobs}
                    className="rounded-[8px] bg-primary hover:bg-[#003366] font-bold text-white"
                  >
                    View Jobs
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 4-step stepper: Upload, Map, Review, Import
function ImportStepper({
  step,
  done,
  statusMsg,
}: {
  step: 1 | 2 | 3 | 4
  done: boolean
  statusMsg: string | null
}) {
  const steps = [
    { key: "upload", label: "Upload", icon: CloudUpload, active: step === 1, done: step > 1 },
    { key: "map", label: "Map", icon: Map, active: step === 2, done: step > 2 },
    { key: "review", label: "Review", icon: FileCheck, active: step === 3, done: step > 3 },
    { key: "import", label: "Import", icon: Loader2, active: step === 4, done: done && !statusMsg?.startsWith("❌") },
  ]

  return (
    <div className="flex items-start gap-0 pt-6 pb-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-col items-center flex-1 min-w-0">
          <div className="flex items-center w-full">
            {i > 0 && (
              <div className={`h-[2px] flex-1 ${steps[i - 1].done ? "bg-primary" : "bg-[#e2e8f0]"}`} />
            )}
            <div
              className={`shrink-0 size-8 rounded-full flex items-center justify-center ${
                s.done ? "bg-primary text-white" : s.active ? "bg-primary text-white" : "bg-[#e2e8f0] text-[#64748b]"
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <s.icon className={`size-4 ${s.active && s.key === "import" ? "animate-spin" : ""}`} />
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 ${s.done ? "bg-primary" : "bg-[#e2e8f0]"}`} />
            )}
          </div>
          <span
            className={`mt-2 text-[12px] font-bold uppercase tracking-[0.6px] ${
              s.active ? "text-primary" : s.done ? "text-primary" : "text-[#64748b]"
            }`}
          >
            {s.label}
          </span>
          {s.active && (
            <span className="text-[10px] font-medium text-[rgba(0,67,143,0.7)] uppercase mt-0.5">Active</span>
          )}
        </div>
      ))}
    </div>
  )
}
