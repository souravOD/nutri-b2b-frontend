"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import AppShell from "@/components/app-shell"
import ImportWizard from "@/components/import-wizard"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/backend"
import { formatDistanceToNow } from "date-fns"
import {
  RefreshCw,
  Plus,
  Globe,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  Check,
} from "lucide-react"

// ────────────────────────────────────────────────────────────────
// Types — mapped from orchestration.orchestration_runs
// ────────────────────────────────────────────────────────────────

type RunStatus = "pending" | "running" | "completed" | "failed"

type Run = {
  id: string
  flowName: string
  sourceName: string | null
  status: RunStatus
  progressPct: number
  currentLayer: string | null
  totalErrors: number
  totalRecordsWritten: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
}

type PipelineLayer = {
  id: string
  pipelineName: string | null
  status: string
  recordsInput: number
  recordsProcessed: number
  recordsWritten: number
  recordsFailed: number
  durationSeconds: string | null
  errorMessage: string | null
}

type RunDetail = Run & { layers: PipelineLayer[] }

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function toRun(j: any): Run {
  return {
    id: j.id,
    flowName: j.flowName ?? j.flow_name ?? "unknown",
    sourceName: j.sourceName ?? j.source_name ?? null,
    status: normalizeStatus(j.status),
    progressPct: j.progressPct ?? j.progress_pct ?? 0,
    currentLayer: j.currentLayer ?? j.current_layer ?? null,
    totalErrors: j.totalErrors ?? j.total_errors ?? 0,
    totalRecordsWritten: j.totalRecordsWritten ?? j.total_records_written ?? 0,
    createdAt: j.createdAt ?? j.created_at ?? new Date().toISOString(),
    startedAt: j.startedAt ?? j.started_at ?? null,
    completedAt: j.completedAt ?? j.completed_at ?? null,
    errorMessage: j.errorMessage ?? j.error_message ?? null,
  }
}

function normalizeStatus(s: string): RunStatus {
  const raw = String(s || "pending").toLowerCase()
  if (raw === "completed") return "completed"
  if (raw === "failed") return "failed"
  if (raw === "running" || raw === "processing") return "running"
  return "pending"
}

function formatDuration(sec: string | number | null): string {
  if (!sec) return "—"
  const n = typeof sec === "string" ? parseFloat(sec) : sec
  if (n < 60) return `${n.toFixed(1)}s`
  return `${Math.floor(n / 60)}m ${Math.round(n % 60)}s`
}

function flowLabel(name: string): string {
  if (name === "full_ingestion") return "Full Pipeline"
  if (name === "bronze_to_gold") return "Bronze → Gold"
  return name
}

function layerLabel(name: string | null): string {
  if (!name) return "—"
  return name.replace(/_/g, " → ").replace(/to/g, "→").replace(/  /g, " ")
}

function layerStatusIcon(status: string): string {
  if (status === "completed") return "✅"
  if (status === "running") return "🔄"
  if (status === "failed") return "❌"
  return "⏳"
}

/** Derive Ref ID from run id (e.g. Ref: #A1B2-C) */
function refFromId(id: string): string {
  const hash = id.replace(/-/g, "").slice(-8).slice(0, 4).toUpperCase()
  const suffix = String.fromCharCode(65 + (id.charCodeAt(0) % 26))
  return `Ref: #${hash}-${suffix}`
}

/** Truncated job ID for display */
function jobIdDisplay(id: string): string {
  if (id.length <= 20) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

/** Most recent timestamp for "Updated" column */
function updatedAt(run: Run): string {
  return run.completedAt ?? run.startedAt ?? run.createdAt
}

const PAGE_SIZE = 10

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const searchParams = useSearchParams()
  const [runs, setRuns] = React.useState<Run[]>([])
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Open run detail when navigating from alerts (e.g. /jobs?run=uuid)
  const runParam = searchParams.get("run")
  React.useEffect(() => {
    if (runParam) setSelectedRunId(runParam)
  }, [runParam])

  const load = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/ingest/runs")
      const json = await res.json()
      setRuns((json.data ?? []).map(toRun))
    } catch {
      // Ignore — table may be empty or API unreachable
    }
  }, [])

  React.useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  // Summary stats (computed from runs) — Figma: 4 cards
  const stats = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const totalToday = runs.filter((r) => r.createdAt.startsWith(today)).length
    const processing = runs.filter((r) => r.status === "running" || r.status === "pending").length
    const failures = runs.filter((r) => r.status === "failed").length
    const completed = runs.filter((r) => r.status === "completed").length
    const successRate =
      completed + failures > 0 ? ((completed / (completed + failures)) * 100).toFixed(1) : "100"
    return {
      totalToday: totalToday || runs.length,
      processing,
      failures,
      successRate,
    }
  }, [runs])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE))
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const paginatedRuns = runs.slice(startIdx, startIdx + PAGE_SIZE)
  const startNum = runs.length === 0 ? 0 : startIdx + 1
  const endNum = Math.min(startIdx + PAGE_SIZE, runs.length)

  return (
    <AppShell title="Data Ingestion Jobs">
      <div className="container mx-auto p-10 space-y-6 bg-[#f5f7f8] min-h-screen">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[12px]">
          <Link href="/dashboard" className="font-medium text-[#64748b] hover:text-[#0f172a]">
            Portal
          </Link>
          <span className="text-[#64748b]">/</span>
          <span className="font-medium text-[#0f172a]">Jobs</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px]">
              Data Ingestion Jobs
            </h1>
            <p className="text-[16px] font-medium text-[#64748b]">
              Monitor and manage all active and historical ingestion tasks.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Button
              variant="outline"
              onClick={load}
              className="border-[#e2e8f0] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] text-[#334155] font-bold"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh
            </Button>
            <ImportWizard
              onComplete={load}
              triggerLabel="Start Import"
              triggerClassName="bg-[#00438f] hover:bg-[#003366] text-white font-bold rounded-[8px]"
            />
          </div>
        </div>

        {/* Summary Stats Cards — Figma: 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] pt-[29px] pb-[21px] px-[21px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <p className="text-[16px] font-medium text-[#64748b]">Total Jobs Today</p>
            <p className="text-[24px] font-bold text-[#0f172a] mt-1">{stats.totalToday}</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] pt-[29px] pb-[21px] px-[21px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <p className="text-[16px] font-medium text-[#64748b]">Processing</p>
            <p className="text-[24px] font-bold text-[#00438f] mt-1">{stats.processing}</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] pt-[29px] pb-[21px] px-[21px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <p className="text-[16px] font-medium text-[#64748b]">Failures</p>
            <p className="text-[24px] font-bold text-[#ef4444] mt-1">{stats.failures}</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] pt-[29px] pb-[21px] px-[21px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <p className="text-[16px] font-medium text-[#64748b]">Success Rate</p>
            <p className="text-[24px] font-bold text-[#10b981] mt-1">{stats.successRate}%</p>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f8fafc] border-b border-[#e2e8f0] hover:bg-[#f8fafc]">
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Job ID
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Type
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Source
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Progress
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] text-center">
                  Errors
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px]">
                  Updated
                </TableHead>
                <TableHead className="px-6 py-4 text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-sm text-[#64748b]">
                    No ingestion jobs yet. Use Start Import to upload a CSV.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRuns.map((run) => (
                  <TableRow
                    key={run.id}
                    className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]/50"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-[14px] text-[#0f172a]">
                          {jobIdDisplay(run.id)}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] uppercase mt-0.5">
                          {refFromId(run.id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <TypeCell run={run} />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <SourceCell run={run} />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <ProgressCell run={run} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span
                        className={
                          run.totalErrors > 0
                            ? "text-[14px] font-bold text-[#ef4444]"
                            : "text-[14px] text-[#64748b]"
                        }
                      >
                        {run.totalErrors}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-[14px] text-[#64748b]">
                      {formatDistanceToNow(new Date(updatedAt(run)), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <ActionsCell run={run} onView={() => setSelectedRunId(run.id)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {runs.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
              <p className="text-[14px] text-[#64748b]">
                Showing {startNum} to {endNum} of {runs.length} ingestion jobs
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-[8px]"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) pageNum = i + 1
                  else if (currentPage <= 3) pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = currentPage - 2 + i
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      className={`h-10 w-10 rounded-[8px] ${
                        currentPage === pageNum
                          ? "bg-[#00438f] hover:bg-[#003366] text-white"
                          : ""
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-[8px]"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RunDetailDialog
        runId={selectedRunId}
        onOpenChange={(o) => !o && setSelectedRunId(null)}
      />
    </AppShell>
  )
}

// ────────────────────────────────────────────────────────────────
// Table cell components
// ────────────────────────────────────────────────────────────────

/** TYPE column — Figma: show sourceName (products/customers) as blue tag */
function TypeCell({ run }: { run: Run }) {
  const label = run.sourceName ?? flowLabel(run.flowName)
  return (
    <span className="text-[14px] font-medium text-[#00438f] capitalize">{label}</span>
  )
}

function SourceCell({ run }: { run: Run }) {
  const isCsv = run.flowName === "full_ingestion" || (run.sourceName ?? "").toLowerCase().includes("csv")
  const label = isCsv ? "CSV Upload" : (run.sourceName ? formatSourceLabel(run.sourceName) : "—")
  return (
    <div className="flex items-center gap-1.5">
      {isCsv ? (
        <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#475569]" />
      ) : (
        <Globe className="h-4 w-4 shrink-0 text-[#475569]" />
      )}
      <span className="text-[14px] text-[#475569]">{label}</span>
    </div>
  )
}

function formatSourceLabel(s: string): string {
  const lower = (s ?? "").toLowerCase()
  if (lower === "csv_upload" || lower === "csv" || lower.includes("csv")) return "CSV Upload"
  return s || ""
}

function StatusPill({ status }: { status: RunStatus }) {
  const config = {
    completed: { bg: "bg-[#d1fae5]", text: "text-[#047857]", label: "Completed" },
    failed: { bg: "bg-[#fee2e2]", text: "text-[#b91c1c]", label: "Failed" },
    running: { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]", label: "Processing" },
    pending: { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]", label: "Processing" },
  }
  const c = config[status] ?? config.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

/** Progress column: bar for running jobs, "100%" for completed/failed */
function ProgressCell({ run }: { run: Run }) {
  const isRunning = run.status === "running" || run.status === "pending"
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#10b981]"
            style={{ width: `${run.progressPct}%` }}
          />
        </div>
        <span className="text-[12px] font-bold text-[#475569] w-8 text-right shrink-0">
          {run.progressPct}%
        </span>
      </div>
    )
  }
  return (
    <span className="text-[14px] text-[#64748b]">100%</span>
  )
}

function ActionsCell({ run, onView }: { run: Run; onView: () => void }) {
  if (run.status === "failed") {
    return (
      <Link
        href="/products?import=1"
        className="text-[14px] font-bold text-[#00438f] hover:underline"
      >
        Retry
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onView}
      className="text-[14px] font-bold text-[#00438f] hover:underline"
    >
      View
    </button>
  )
}

// ────────────────────────────────────────────────────────────────
// Run Detail Dialog
// ────────────────────────────────────────────────────────────────

function RunDetailDialog({
  runId,
  onOpenChange = () => {},
}: {
  runId: string | null
  onOpenChange?: (o: boolean) => void
}) {
  const [detail, setDetail] = React.useState<RunDetail | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let abort = false
    setDetail(null)
    async function load() {
      if (!runId) return
      setLoading(true)
      try {
        const res = await apiFetch(`/api/v1/ingest/runs/${runId}`)
        const json = await res.json()
        if (!abort && json.data) {
          setDetail({
            ...toRun(json.data),
            layers: (json.data.layers ?? []).map((l: any) => ({
              id: l.id,
              pipelineName: l.pipelineName ?? l.pipeline_name ?? null,
              status: l.status ?? "pending",
              recordsInput: l.recordsInput ?? l.records_input ?? 0,
              recordsProcessed: l.recordsProcessed ?? l.records_processed ?? 0,
              recordsWritten: l.recordsWritten ?? l.records_written ?? 0,
              recordsFailed: l.recordsFailed ?? l.records_failed ?? 0,
              durationSeconds: l.durationSeconds ?? l.duration_seconds ?? null,
              errorMessage: l.errorMessage ?? l.error_message ?? null,
            })),
          })
        }
      } finally {
        if (!abort) setLoading(false)
      }
    }
    load()
    return () => {
      abort = true
    }
  }, [runId])

  return (
    <Dialog open={!!runId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
        </DialogHeader>
        {loading && <div className="text-sm text-muted-foreground py-4">Loading...</div>}
        {detail && (
          <div className="space-y-5">
            {/* Job ID — full UUID per Figma */}
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                Job ID
              </p>
              <p className="font-mono text-[14px] text-[#0f172a] break-all">{detail.id}</p>
            </div>

            {/* Details: TYPE, SOURCE, STATUS — key-value layout per Figma */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                  Type
                </p>
                <span className="text-[14px] font-medium text-[#00438f] capitalize">
                  {detail.sourceName ?? flowLabel(detail.flowName)}
                </span>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                  Source
                </p>
                <span className="text-[14px] text-[#475569]">
                  {detail.flowName === "full_ingestion"
                    ? "CSV Upload"
                    : formatSourceLabel(detail.sourceName ?? "") || "—"}
                </span>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                  Status
                </p>
                <StatusPill status={detail.status} />
              </div>
            </div>

            {/* Ingestion Progress — bar + % per Figma */}
            <div>
              <div className="flex justify-between text-[14px] mb-2">
                <span className="font-medium text-[#0f172a]">Ingestion Progress</span>
                <span className="font-bold text-[#475569]">{detail.progressPct}%</span>
              </div>
              <Progress value={detail.progressPct} className="h-2" />
            </div>

            {/* Error message — operation-level error per Figma */}
            {detail.errorMessage && (
              <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-[#b91c1c]">
                {detail.errorMessage}
              </div>
            )}

            {/* Errors card — "No errors found in metadata validation" per Figma */}
            <div className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-2">
                Errors
              </p>
              {detail.totalErrors === 0 ? (
                <div className="flex items-center gap-2 text-[14px] text-[#047857]">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>No errors found in metadata validation.</span>
                </div>
              ) : (
                <div className="text-[14px] text-[#b91c1c]">
                  {detail.totalErrors} error{detail.totalErrors !== 1 ? "s" : ""} recorded.
                </div>
              )}
            </div>

            {/* Action buttons — disabled until backend ready */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                disabled
                className="border-[#e2e8f0] rounded-[8px]"
                title="Coming soon"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button
                disabled
                className="bg-[#00438f] hover:bg-[#003366] text-white rounded-[8px]"
                title="Coming soon"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Items
              </Button>
            </div>

            {/* Pipeline Layers — collapsible for debugging */}
            {detail.layers.length > 0 && (
              <details className="group">
                <summary className="text-[14px] font-medium text-[#64748b] cursor-pointer list-none">
                  Pipeline Layers ({detail.layers.length})
                </summary>
                <div className="mt-2 rounded-md border overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8fafc]">
                      <tr>
                        <th className="text-left p-2 text-[12px] font-bold text-[#64748b]">Layer</th>
                        <th className="text-left p-2 text-[12px] font-bold text-[#64748b]">Status</th>
                        <th className="text-right p-2 text-[12px] font-bold text-[#64748b]">In</th>
                        <th className="text-right p-2 text-[12px] font-bold text-[#64748b]">Written</th>
                        <th className="text-right p-2 text-[12px] font-bold text-[#64748b]">Failed</th>
                        <th className="text-right p-2 text-[12px] font-bold text-[#64748b]">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.layers.map((l) => (
                        <tr key={l.id} className="border-t border-[#e2e8f0]">
                          <td className="p-2 whitespace-nowrap">{layerLabel(l.pipelineName)}</td>
                          <td className="p-2 whitespace-nowrap">
                            {layerStatusIcon(l.status)} {l.status}
                          </td>
                          <td className="p-2 text-right">{l.recordsInput}</td>
                          <td className="p-2 text-right">{l.recordsWritten}</td>
                          <td className="p-2 text-right">
                            <span className={l.recordsFailed > 0 ? "text-[#b91c1c]" : ""}>
                              {l.recordsFailed}
                            </span>
                          </td>
                          <td className="p-2 text-right text-[#64748b]">
                            {formatDuration(l.durationSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
