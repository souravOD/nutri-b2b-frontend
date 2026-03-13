"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/lib/backend"
import { formatDistanceToNow } from "date-fns"
import { ChevronLeft, ChevronRight, ClipboardList, RotateCcw } from "lucide-react"

const PAGE_SIZE = 50

interface AuditEntry {
  id: string
  tableName: string
  recordId: string
  action: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedBy: string | null
  changedAt: string
  ipAddress: string | null
  userAgent: string | null
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
}

const ENTITY_OPTIONS = [
  { value: "all", label: "All Tables" },
  { value: "gold.products", label: "Products" },
  { value: "gold.b2b_customers", label: "Customers" },
  { value: "gold.b2b_customer_health_profiles", label: "Health Profiles" },
  { value: "gold.compliance_rules", label: "Compliance Rules" },
  { value: "public.ingestion_jobs", label: "Ingestion Jobs" },
]

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "INSERT" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
]

export default function AuditPage() {
  const [entries, setEntries] = React.useState<AuditEntry[]>([])
  const [total, setTotal] = React.useState(0)
  const [offset, setOffset] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const [entityFilter, setEntityFilter] = React.useState("all")
  const [actionFilter, setActionFilter] = React.useState("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const fetchEntries = React.useCallback(async (newOffset: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(newOffset) })
      if (entityFilter !== "all") params.set("entity", entityFilter)
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (fromDate) params.set("from", fromDate)
      if (toDate) params.set("to", toDate)
      const res = await apiFetch(`/api/v1/audit?${params}`)
      const json = await res.json()
      const data = json.data ?? json
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [entityFilter, actionFilter, fromDate, toDate])

  React.useEffect(() => {
    setOffset(0)
    fetchEntries(0)
  }, [fetchEntries])

  function handlePageChange(newOffset: number) {
    setOffset(newOffset)
    fetchEntries(newOffset)
  }

  function handleClear() {
    setEntityFilter("all")
    setActionFilter("all")
    setFromDate("")
    setToDate("")
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e293b]">Audit Log</h1>
            <p className="text-sm text-[#64748b] mt-1">Track all data changes across the platform</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchEntries(offset)} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748b] font-medium">Table</label>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748b] font-medium">Action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748b] font-medium">From</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 w-36"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748b] font-medium">To</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 w-36"
                />
              </div>

              {(entityFilter !== "all" || actionFilter !== "all" || fromDate || toDate) && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-9 text-[#64748b]">
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {loading ? "Loading…" : `${total.toLocaleString()} entr${total === 1 ? "y" : "ies"}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!loading && entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
                <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No audit entries yet.</p>
                <p className="text-sm mt-1">Data changes will appear here once activity begins.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Time</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                    <TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-[#f8fafc]"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        <TableCell className="text-sm text-[#64748b] whitespace-nowrap">
                          {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-[#1e293b]">
                          {entry.tableName}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-[#64748b]">
                          {entry.recordId ? `${entry.recordId.slice(0, 8)}…` : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-700"}`}>
                            {entry.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-[#64748b]">
                          {entry.changedBy ? `${entry.changedBy.slice(0, 8)}…` : "system"}
                        </TableCell>
                      </TableRow>
                      {expandedId === entry.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-[#f8fafc] py-3 px-4">
                            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                              {entry.oldValues && (
                                <div>
                                  <p className="font-semibold text-[#64748b] mb-1">Before</p>
                                  <pre className="bg-white border rounded p-2 overflow-auto max-h-48 text-[11px]">
                                    {JSON.stringify(entry.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.newValues && (
                                <div>
                                  <p className="font-semibold text-[#64748b] mb-1">After</p>
                                  <pre className="bg-white border rounded p-2 overflow-auto max-h-48 text-[11px]">
                                    {JSON.stringify(entry.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.ipAddress && (
                                <p className="col-span-2 text-[#94a3b8]">
                                  IP: {entry.ipAddress} · UA: {entry.userAgent?.slice(0, 80) ?? "—"}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-[#64748b]">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(offset + PAGE_SIZE)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
