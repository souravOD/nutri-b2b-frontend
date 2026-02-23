"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import EnhancedDataTable from "@/components/enhanced-data-table"
import type { ColumnDef } from "@tanstack/react-table"
import StatusBadge from "@/components/status-badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/backend"

// ────────────────────────────────────────────────────────────────
// Types — mapped from orchestration.orchestration_runs
// ────────────────────────────────────────────────────────────────

type RunStatus = "pending" | "running" | "completed" | "failed"

type Run = {
  id: string
  flowName: string        // "full_ingestion" | "bronze_to_gold"
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

/** Map snake_case API response → camelCase Run */
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
    createdAt: j.createdAt ?? j.created_at,
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

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [runs, setRuns] = React.useState<Run[]>([])
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)

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
    const t = setInterval(load, 5000) // poll every 5s (lighter than 1.5s)
    return () => clearInterval(t)
  }, [load])

  const columns: ColumnDef<Run>[] = [
    {
      accessorKey: "id",
      header: "Run ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(0, 8)}…</span>
      ),
    },
    {
      accessorKey: "flowName",
      header: "Flow",
      cell: ({ row }) => <span className="text-sm">{flowLabel(row.original.flowName)}</span>,
    },
    {
      accessorKey: "sourceName",
      header: "Source",
      cell: ({ row }) => <span className="text-sm capitalize">{row.original.sourceName ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "progressPct",
      header: "Progress",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={row.original.progressPct} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground w-8 text-right">{row.original.progressPct}%</span>
        </div>
      ),
    },
    {
      accessorKey: "currentLayer",
      header: "Current Layer",
      cell: ({ row }) => <span className="text-xs">{layerLabel(row.original.currentLayer)}</span>,
    },
    {
      accessorKey: "totalErrors",
      header: "Errors",
      cell: ({ row }) => (
        <span className={row.original.totalErrors > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
          {row.original.totalErrors}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedRunId(row.original.id)}>
          Details
        </Button>
      ),
    },
  ]

  return (
    <AppShell title="Ingestion Runs">
      <div className="mb-3 flex gap-2 justify-end">
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>
      <EnhancedDataTable data={runs} columns={columns} />
      <RunDetailDialog
        runId={selectedRunId}
        onOpenChange={(o) => !o && setSelectedRunId(null)}
      />
    </AppShell>
  )
}

// ────────────────────────────────────────────────────────────────
// Run Detail Dialog — shows pipeline layer breakdown
// ────────────────────────────────────────────────────────────────

function RunDetailDialog({
  runId,
  onOpenChange = () => { },
}: {
  runId: string | null
  onOpenChange?: (o: boolean) => void
}) {
  const [detail, setDetail] = React.useState<RunDetail | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let abort = false
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
    return () => { abort = true }
  }, [runId])

  return (
    <Dialog open={!!runId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Run Details</DialogTitle>
        </DialogHeader>
        {loading && <div className="text-sm text-muted-foreground py-4">Loading...</div>}
        {detail && (
          <div className="space-y-5">
            {/* Summary grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono text-xs">{detail.id.slice(0, 12)}…</span>
              </div>
              <div>
                <span className="text-muted-foreground">Flow: </span>
                {flowLabel(detail.flowName)}
              </div>
              <div>
                <span className="text-muted-foreground">Source: </span>
                <span className="capitalize">{detail.sourceName ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status: </span>
                <StatusBadge status={detail.status} />
              </div>
              <div>
                <span className="text-muted-foreground">Records: </span>
                {detail.totalRecordsWritten}
              </div>
              <div>
                <span className="text-muted-foreground">Errors: </span>
                <span className={detail.totalErrors > 0 ? "text-red-600" : ""}>{detail.totalErrors}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="text-sm mb-1 text-muted-foreground">
                Progress — {detail.progressPct}%
              </div>
              <Progress value={detail.progressPct} className="h-2" />
            </div>

            {/* Error message if present */}
            {detail.errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {detail.errorMessage}
              </div>
            )}

            {/* Pipeline layers table */}
            <div>
              <div className="text-sm font-medium mb-2">Pipeline Layers</div>
              {detail.layers.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pipeline runs yet — orchestrator hasn't started processing.
                </div>
              ) : (
                <div className="rounded-md border overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Layer</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">In</th>
                        <th className="text-right p-2">Written</th>
                        <th className="text-right p-2">Failed</th>
                        <th className="text-right p-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.layers.map((l) => (
                        <tr key={l.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">{layerLabel(l.pipelineName)}</td>
                          <td className="p-2 whitespace-nowrap">
                            {layerStatusIcon(l.status)} {l.status}
                          </td>
                          <td className="p-2 text-right">{l.recordsInput}</td>
                          <td className="p-2 text-right">{l.recordsWritten}</td>
                          <td className="p-2 text-right">
                            <span className={l.recordsFailed > 0 ? "text-red-600" : ""}>{l.recordsFailed}</span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {formatDuration(l.durationSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
