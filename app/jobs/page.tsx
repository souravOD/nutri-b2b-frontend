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

const JOBS_ENABLED = process.env.NEXT_PUBLIC_B2B_ENABLE_JOBS === "1"

type Job = {
  id: string
  type: string
  source: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  errorCount: number
  createdAt: string
  updatedAt: string
}

export default function JobsPage() {
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null)

  const load = React.useCallback(async () => {
    const res = await apiFetch("/jobs")
    const { data } = await res.json()
    // Transform backend shape → your UI shape (no UI logic change)
   setJobs(
     (data ?? []).map((j: any) => {
       const rawStatus = String(j.status || "queued").toLowerCase();
       const status: Job["status"] =
         rawStatus === "running" ? "processing" :
         rawStatus === "processing" ? "processing" :
         rawStatus === "completed" ? "completed" :
         rawStatus === "failed" ? "failed" :
         "queued";
       return {
         id: j.id,
         type: j.mode,                         // "products" | "customers" | "api_sync"
         source: j.params?.source ?? "CSV",
         status,
         progress: j.progressPct ?? 0,
         errorCount: j.totals?.errors ?? 0,
         createdAt: j.createdAt,
         updatedAt: j.updatedAt,
       } as Job;
     })
   )
  }, [])
  React.useEffect(() => {
    load()
    const t = setInterval(load, 1500)
    return () => clearInterval(t)
  }, [load])

  const columns: ColumnDef<Job>[] = [
    { accessorKey: "id", header: "Job ID" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "source", header: "Source" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ row }) => <Progress value={row.original.progress} />,
    },
    {
      accessorKey: "errorCount",
      header: "Errors",
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => <span className="text-sm">{new Date(row.original.updatedAt).toLocaleTimeString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setSelectedJob(row.original)}>
            {"Details"}
          </Button>
          {row.original.status === "failed" && <Button size="sm">{"Retry"}</Button>}
          {(row.original.status === "queued" || row.original.status === "processing") && (
            <Button size="sm" variant="outline">
              {"Cancel"}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AppShell title="Ingestion Jobs">
      {!JOBS_ENABLED && (
        <div className="mb-3 rounded-md border bg-muted/40 text-sm px-3 py-2">
          Jobs and ingestion are temporarily disconnected. This surface is kept for upcoming changes.
        </div>
      )}
      <div className="mb-3 flex gap-2">
        <Button
          disabled={!JOBS_ENABLED}
          title={!JOBS_ENABLED ? "Temporarily disconnected" : undefined}
          onClick={async () => {
            const res = await apiFetch("/jobs?mode=products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "import", source: "CSV" }),
            })
            await res.json().catch(() => ({}))
            load()
          }}
        >
          {"Start Import"}
        </Button>
        <Button variant="outline" onClick={load}>
          {"Refresh"}
        </Button>
      </div>
      <EnhancedDataTable data={jobs} columns={columns} />
      <JobDetail job={selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)} />
    </AppShell>
  )
}

function JobDetail({ job, onOpenChange = () => {} }: { job: Job | null; onOpenChange?: (o: boolean) => void }) {
  const [errors, setErrors] = React.useState<Array<{ rowNo: number; field?: string | null; code?: string | null; message?: string | null }>>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let abort = false
    async function load() {
      if (!job) return
      setLoading(true)
      try {
        const res = await apiFetch(`/jobs/${job.id}/errors`)
        const j = await res.json().catch(() => ({ data: [] }))
        if (!abort) setErrors(Array.isArray(j?.data) ? j.data : [])
      } finally {
        if (!abort) setLoading(false)
      }
    }
    load()
    return () => { abort = true }
  }, [job?.id])

  async function download(url: string, filename: string) {
    const r = await apiFetch(url)
    const blob = await r.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{"Job Details"}</DialogTitle>
        </DialogHeader>
        {!job ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{"ID: "}</span>
                {job.id}
              </div>
              <div>
                <span className="text-muted-foreground">{"Type: "}</span>
                {job.type}
              </div>
              <div>
                <span className="text-muted-foreground">{"Source: "}</span>
                {job.source}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{"Status: "}</span>
                <StatusBadge status={job.status} />
              </div>
            </div>
            <div>
              <div className="text-sm mb-1">{"Progress"}</div>
              <Progress value={job.progress} />
            </div>
            <div>
              <div className="text-sm mb-1">{"Errors"}</div>
              {loading ? (
                <div className="text-sm text-muted-foreground">{"Loading..."}</div>
              ) : errors.length === 0 ? (
                <div className="text-sm text-muted-foreground">{"No errors"}</div>
              ) : (
                <div className="max-h-56 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Row</th>
                        <th className="text-left p-2">Field</th>
                        <th className="text-left p-2">Code</th>
                        <th className="text-left p-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 whitespace-nowrap">{e.rowNo}</td>
                          <td className="p-2 whitespace-nowrap">{e.field || '-'}</td>
                          <td className="p-2 whitespace-nowrap">{e.code || '-'}</td>
                          <td className="p-2">{e.message || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => download(`/jobs/${job.id}/errors.csv`, `job_${job.id}_errors.csv`)}>
                {"Download Report"}
              </Button>
              <Button onClick={() => download(`/jobs/${job.id}/items.csv`, `job_${job.id}_items.csv`)}>
                {"Export Items"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
