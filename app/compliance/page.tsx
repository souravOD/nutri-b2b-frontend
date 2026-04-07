"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileText,
  Loader2,
  PlayCircle,
  Search,
  Shield,
  XCircle,
} from "lucide-react"
import { apiFetch } from "@/lib/backend"

// ── Types ────────────────────────────────────────────────────────────────────
interface ComplianceCheck {
  id: string
  vendor_id: string
  rule_id: string
  status: "compliant" | "warning" | "non_compliant"
  score: number
  products_checked: number
  products_failed: number
  details: unknown
  checked_by: string
  checked_at: string
  next_review: string | null
  rule_title: string
  regulation: string
  severity: string
}

interface ComplianceSummary {
  totalRulesChecked: number
  compliant: number
  warning: number
  nonCompliant: number
  overallScore: number
}

type EffectiveStatus = "compliant" | "warning" | "non_compliant" | "expired"
type TabKey = "all" | "compliant" | "warning" | "non_compliant"

const PAGE_SIZE = 20

// ── Helpers ──────────────────────────────────────────────────────────────────
function resolveStatus(check: ComplianceCheck): EffectiveStatus {
  if (check.next_review && new Date(check.next_review) < new Date()) return "expired"
  return check.status
}

function getStatusIconBox(status: EffectiveStatus) {
  switch (status) {
    case "compliant":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d1fae5]">
          <CheckCircle className="h-5 w-5 text-[#047857]" />
        </div>
      )
    case "warning":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7]">
          <AlertTriangle className="h-5 w-5 text-[#92400e]" />
        </div>
      )
    case "non_compliant":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fee2e2]">
          <XCircle className="h-5 w-5 text-[#b91c1c]" />
        </div>
      )
    case "expired":
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
          <Calendar className="h-5 w-5 text-[#64748b]" />
        </div>
      )
    default:
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
          <Shield className="h-5 w-5 text-[#64748b]" />
        </div>
      )
  }
}

function getStatusPill(status: EffectiveStatus) {
  switch (status) {
    case "compliant":
      return (
        <span className="rounded-[4px] px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] uppercase bg-[#0f172a] text-white">
          COMPLIANT
        </span>
      )
    case "warning":
      return (
        <span className="rounded-[4px] px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] uppercase bg-[#fef3c7] text-[#92400e]">
          WARNING
        </span>
      )
    case "non_compliant":
      return (
        <span className="rounded-[4px] px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] uppercase bg-[#fee2e2] text-[#b91c1c]">
          NOT COMPLIANT
        </span>
      )
    case "expired":
      return (
        <span className="rounded-[4px] px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] uppercase bg-[#f1f5f9] text-[#475569]">
          EXPIRED
        </span>
      )
    default:
      return null
  }
}

const formatDate = (d: string | null) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString()
}

function buildPageNumbers(current: number, totalPages: number): number[] {
  const delta = 2
  const range: number[] = []
  for (
    let i = Math.max(1, current - delta);
    i <= Math.min(totalPages, current + delta);
    i++
  ) {
    range.push(i)
  }
  return range
}

// ── Check Detail Dialog ──────────────────────────────────────────────────────
function CheckDetailDialog({
  check,
  onOpenChange,
}: {
  check: ComplianceCheck | null
  onOpenChange: (open: boolean) => void
}) {
  if (!check) return null
  const effectiveStatus = resolveStatus(check)
  return (
    <Dialog open={!!check} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Rule</p>
            <p className="text-[14px] font-semibold text-[#0f172a]">{check.rule_title}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Regulation</p>
            <p className="text-[14px] text-[#475569]">{check.regulation}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Status</p>
              {getStatusPill(effectiveStatus)}
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Score</p>
              <p className="text-[14px] font-bold text-[#0f172a]">{check.score}%</p>
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                Products Checked
              </p>
              <p className="text-[14px] text-[#475569]">{check.products_checked}</p>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
              Products Failed
            </p>
            <p className={`text-[14px] font-semibold ${check.products_failed > 0 ? "text-[#b91c1c]" : "text-[#475569]"}`}>
              {check.products_failed}
            </p>
          </div>
          <div>
            <div className="flex justify-between text-[14px] mb-2">
              <span className="font-medium text-[#0f172a]">Compliance Score</span>
              <span className="font-bold text-[#475569]">{check.score}%</span>
            </div>
            <Progress value={check.score} className="h-2" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Checked</p>
            <p className="text-[14px] text-[#475569]">{formatDate(check.checked_at)}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Next Review</p>
            <p className="text-[14px] text-[#475569]">{formatDate(check.next_review)}</p>
          </div>
          {check.details && typeof check.details === "object" && Object.keys(check.details as object).length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">Details</p>
              <pre className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[12px] text-[#475569] overflow-auto max-h-40">
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    totalRulesChecked: 0,
    compliant: 0,
    warning: 0,
    nonCompliant: 0,
    overallScore: 0,
  })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("all")

  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null)

  // Reset page when any filter changes
  const changeTab = (tab: TabKey) => { setActiveTab(tab); setPage(1) }
  const changeSearch = (v: string) => { setSearch(v); setPage(1) }
  const changeSeverity = (v: string) => { setSeverity(v); setPage(1) }
  const changeFromDate = (v: string) => { setFromDate(v); setPage(1) }
  const changeToDate = (v: string) => { setToDate(v); setPage(1) }

  const fetchChecks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (activeTab !== "all") params.set("status", activeTab)
      if (search.trim()) params.set("q", search.trim())
      if (severity && severity !== "_all") params.set("severity", severity)
      if (fromDate) params.set("from_date", fromDate)
      if (toDate) params.set("to_date", toDate)

      const [checksRes, summaryRes] = await Promise.all([
        apiFetch(`/api/compliance/checks?${params.toString()}`),
        apiFetch("/api/compliance/summary"),
      ])
      if (!checksRes.ok) throw new Error(`Compliance checks failed (${checksRes.status})`)
      if (!summaryRes.ok) throw new Error(`Compliance summary failed (${summaryRes.status})`)
      const checksJson = await checksRes.json()
      const summaryJson = await summaryRes.json()
      setChecks(checksJson.data || [])
      setTotal(checksJson.total ?? 0)
      setSummary({
        totalRulesChecked: summaryJson.totalRulesChecked ?? 0,
        compliant:         summaryJson.compliant         ?? 0,
        warning:           summaryJson.warning           ?? 0,
        nonCompliant:      summaryJson.nonCompliant       ?? 0,
        overallScore:      summaryJson.overallScore       ?? 0,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load compliance data")
    } finally {
      setLoading(false)
    }
  }, [page, activeTab, search, severity, fromDate, toDate])

  useEffect(() => { fetchChecks() }, [fetchChecks])

  const runComplianceCheck = async () => {
    try {
      setRunning(true)
      const res = await apiFetch("/api/compliance/run", { method: "POST" })
      if (res.ok) await fetchChecks()
    } catch (err) {
      console.error("[compliance] run error:", err)
    } finally {
      setRunning(false)
    }
  }

  const generateReport = async () => {
    try {
      setReportLoading(true)
      const res = await apiFetch("/api/compliance/report")
      if (!res.ok) throw new Error("Failed to generate report")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[compliance] report error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate report")
    } finally {
      setReportLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageNumbers = buildPageNumbers(page, totalPages)
  const startRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endRow = Math.min(page * PAGE_SIZE, total)

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Certifications", count: summary.totalRulesChecked },
    { key: "compliant", label: "Compliant", count: summary.compliant },
    { key: "warning", label: "Warnings", count: summary.warning },
    { key: "non_compliant", label: "Non-Compliant", count: summary.nonCompliant },
  ]

  return (
    <AppShell title="Compliance">
      <div className="container mx-auto p-10 space-y-8 bg-[#f8fafc] min-h-screen">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[12px]">
          <Link href="/dashboard" className="font-medium text-[#64748b] hover:text-[#0f172a]">
            Portal
          </Link>
          <span className="text-[#64748b]">/</span>
          <span className="font-medium text-[#0f172a]">Compliance Dashboard</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.75px]">
              Compliance Dashboard
            </h1>
            <p className="text-[16px] text-[#64748b]">
              Monitor regulatory compliance and certification status
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-[#e2e8f0] bg-[#f1f5f9] hover:bg-[#e2e8f0]"
              onClick={runComplianceCheck}
              disabled={running}
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Run Compliance Check
            </Button>
            <Button
              className="bg-[#00438f] hover:bg-[#003366] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              onClick={generateReport}
              disabled={reportLoading || loading}
            >
              {reportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#64748b] tracking-[0.7px] uppercase">Overall Score</p>
                <p className="text-[30px] font-bold text-[#0f172a] mt-2">{summary.overallScore}%</p>
                <Progress value={summary.overallScore} className="mt-2 h-2 bg-[#f1f5f9]" />
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(0,67,143,0.1)]">
                <BarChart3 className="h-5 w-5 text-[#00438f]" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-[#64748b] tracking-[0.7px] uppercase">Compliant</p>
                <p className="text-[30px] font-bold text-[#0f172a] mt-2">{summary.compliant}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#d1fae5]">
                <CheckCircle className="h-5 w-5 text-[#047857]" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-[#64748b] tracking-[0.7px] uppercase">Warnings</p>
                <p className="text-[30px] font-bold text-[#0f172a] mt-2">{summary.warning}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#fef3c7]">
                <AlertTriangle className="h-5 w-5 fill-[#92400e] text-[#92400e]" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-[#64748b] tracking-[0.7px] uppercase">Non-Compliant</p>
                <p className="text-[30px] font-bold text-[#0f172a] mt-2">{summary.nonCompliant}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#fee2e2]">
                <XCircle className="h-5 w-5 text-[#b91c1c]" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs + Table */}
        <div className="space-y-0">
          {/* Underline Tabs */}
          <div className="flex gap-[32px] border-b border-[#e2e8f0]">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTab(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#00438f] text-[#00438f] font-bold"
                    : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-center py-4">
            <div className="relative flex-1 min-w-[200px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Search certifications..."
                className="pl-9 h-9 border-[#e2e8f0] text-[13px]"
              />
            </div>
            <Select value={severity} onValueChange={changeSeverity}>
              <SelectTrigger className="h-9 w-[160px] border-[#e2e8f0] text-[13px]">
                <SelectValue placeholder="All Risk Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => changeFromDate(e.target.value)}
              className="h-9 w-[150px] border-[#e2e8f0] text-[13px]"
            />
            <span className="text-[#94a3b8] text-sm select-none">–</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => changeToDate(e.target.value)}
              className="h-9 w-[150px] border-[#e2e8f0] text-[13px]"
            />
          </div>

          {/* Table */}
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#64748b]" />
              </div>
            ) : checks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Shield className="h-12 w-12 text-[#94a3b8] mb-4" />
                <p className="text-[#64748b]">
                  {search || severity || fromDate || toDate
                    ? "No certifications match your filters."
                    : activeTab === "compliant"
                    ? "No compliant checks"
                    : activeTab === "warning"
                    ? "No warning checks"
                    : activeTab === "non_compliant"
                    ? "No non-compliant checks"
                    : "No compliance checks yet. Run a check to see results."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Certification Name
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Regulation
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Overall Score
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Last Checked
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Next Review
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px] whitespace-nowrap">
                        Status
                      </th>
                      <th className="py-3 px-4 text-right text-[11px] font-bold text-[#64748b] uppercase tracking-[0.5px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => {
                      const effectiveStatus = resolveStatus(check)
                      return (
                        <tr
                          key={check.id}
                          className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-[#0f172a]">
                            <div className="flex items-center gap-3">
                              {getStatusIconBox(effectiveStatus)}
                              <span>{check.rule_title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#64748b] uppercase text-[12px] font-medium">
                            {check.regulation}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Progress value={check.score} className="w-16 h-1.5" />
                              <span className="font-semibold text-[#0f172a]">{check.score}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#64748b] whitespace-nowrap">
                            {formatDate(check.checked_at)}
                          </td>
                          <td className="py-3 px-4 text-[#64748b] whitespace-nowrap">
                            {formatDate(check.next_review)}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusPill(effectiveStatus)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#64748b] hover:text-[#0f172a] h-8 px-3"
                              onClick={() => setSelectedCheck(check)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1.5" />
                              Details
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
                <span className="text-[13px] text-[#64748b]">
                  {startRow} to {endRow} of {total} Certifications
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-[#e2e8f0]"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={n === page ? "default" : "outline"}
                      className={`h-8 w-8 p-0 border-[#e2e8f0] text-[13px] ${
                        n === page ? "bg-[#00438f] hover:bg-[#003366] border-[#00438f]" : ""
                      }`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 border-[#e2e8f0]"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <CheckDetailDialog
        check={selectedCheck}
        onOpenChange={(open) => !open && setSelectedCheck(null)}
      />
    </AppShell>
  )
}
