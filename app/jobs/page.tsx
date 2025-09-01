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
     (data ?? []).map((j: any) => ({
       id: j.id,
       type: j.mode,                         // "products" | "customers" | "api_sync"
       source: j.params?.source ?? "CSV",
       status: j.status,                     // "queued" | "running" | "completed" | "failed" | "canceled"
       progress: j.progressPct ?? 0,
       errorCount: j.totals?.errors ?? 0,
       createdAt: j.createdAt,
       updatedAt: j.updatedAt,
     }))
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
            <Button size="sm" variant="destructive">
              {"Cancel"}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AppShell title="Ingestion Jobs">
      <div className="mb-3 flex gap-2">
        <Button
          onClick={async () => {
            const res = await fetch("/jobs", {
              method: "POST",
              body: JSON.stringify({ type: "import", source: "CSV" }),
            })
            await res.json()
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
  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{"Job Details"}</DialogTitle>
        </DialogHeader>
        {!job ? null : (
          <div className="space-y-3">
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
              {job.errorCount === 0 ? (
                <div className="text-sm text-muted-foreground">{"No errors"}</div>
              ) : (
                <div className="text-sm">{`${job.errorCount} errors (details omitted in demo)`}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">{"Download Report"}</Button>
              <Button>{"Export Items"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
