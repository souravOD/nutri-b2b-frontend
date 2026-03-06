"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, BarChart3, CheckCircle, FileText, Loader2, PlayCircle, Shield, XCircle, FileDown } from "lucide-react"
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function getStatusIconBox(status: string) {
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
    default:
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
          <Shield className="h-5 w-5 text-[#64748b]" />
        </div>
      )
  }
}

function getStatusPill(status: string) {
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
          NON-COMPLIANT
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

// ── Check Detail Dialog ──────────────────────────────────────────────────────
function CheckDetailDialog({
  check,
  onOpenChange,
}: {
  check: ComplianceCheck | null
  onOpenChange: (open: boolean) => void
}) {
  if (!check) return null
  return (
    <Dialog open={!!check} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
              Rule
            </p>
            <p className="text-[14px] font-semibold text-[#0f172a]">{check.rule_title}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
              Regulation
            </p>
            <p className="text-[14px] text-[#475569]">{check.regulation}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                Status
              </p>
              {getStatusPill(check.status)}
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                Score
              </p>
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
            <p
              className={`text-[14px] font-semibold ${
                check.products_failed > 0 ? "text-[#b91c1c]" : "text-[#475569]"
              }`}
            >
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
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
              Checked
            </p>
            <p className="text-[14px] text-[#475569]">{formatDate(check.checked_at)}</p>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
              Next Review
            </p>
            <p className="text-[14px] text-[#475569]">{formatDate(check.next_review)}</p>
          </div>
          {check.details && typeof check.details === "object" && Object.keys(check.details as object).length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] mb-1">
                Details
              </p>
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
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "compliant" | "warning" | "non_compliant">("all")
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [checksRes, summaryRes] = await Promise.all([
        apiFetch("/api/compliance/checks?limit=50"),
        apiFetch("/api/compliance/summary"),
      ])
      const checksJson = await checksRes.json()
      const summaryJson = await summaryRes.json()
      setChecks(checksJson.data || [])
      setSummary(summaryJson)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load compliance data"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const runComplianceCheck = async () => {
    try {
      setRunning(true)
      const res = await apiFetch("/api/compliance/run", { method: "POST" })
      if (res.ok) {
        await fetchData()
      }
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

  const compliantItems = checks.filter((c) => c.status === "compliant")
  const warningItems = checks.filter((c) => c.status === "warning")
  const nonCompliantItems = checks.filter((c) => c.status === "non_compliant")
  const displayedChecks =
    activeTab === "all"
      ? checks
      : activeTab === "compliant"
        ? compliantItems
        : activeTab === "warning"
          ? warningItems
          : nonCompliantItems

  const renderCheckCard = (item: ComplianceCheck) => (
    <Card
      key={item.id}
      className="border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white"
    >
      <CardContent className="p-[25px]">
        <div className="flex gap-4">
          {getStatusIconBox(item.status)}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-[14px] font-bold text-[#0f172a]">{item.rule_title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusPill(item.status)}
                <div className="text-right">
                  <div className="text-[14px] font-semibold text-[#0f172a]">{item.score}%</div>
                  <Progress value={item.score} className="w-16 h-1.5 mt-0.5" />
                </div>
              </div>
            </div>
            <p className="text-[14px] text-[#475569] mt-1">
              {item.regulation} · {item.products_checked} products checked, {item.products_failed} failed
            </p>
            <p className="text-[12px] text-[#94a3b8] mt-2">
              Checked: {formatDate(item.checked_at)} · Next review: {formatDate(item.next_review)}
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                className="bg-[#00438f] hover:bg-[#003366]"
                onClick={() => setSelectedCheck(item)}
              >
                <FileText className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderEmpty = (label: string) => (
    <Card className="border border-[#e2e8f0] rounded-[12px] bg-white">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Shield className="h-12 w-12 text-[#94a3b8] mb-4" />
        <p className="text-[#64748b]">{label}</p>
      </CardContent>
    </Card>
  )

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

        {/* Underline Tabs */}
        <div className="space-y-6">
          <div className="flex gap-[32px] border-b border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              All Items ({checks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compliant")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "compliant"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Compliant ({compliantItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("warning")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "warning"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Warnings ({warningItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("non_compliant")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "non_compliant"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Non-Compliant ({nonCompliantItems.length})
            </button>
          </div>

          {/* Check List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#64748b]" />
              </div>
            ) : displayedChecks.length === 0 ? (
              renderEmpty(
                activeTab === "compliant"
                  ? "No compliant checks"
                  : activeTab === "warning"
                    ? "No warning checks"
                    : activeTab === "non_compliant"
                      ? "No non-compliant checks"
                      : "No compliance checks yet. Run a check to see results."
              )
            ) : (
              displayedChecks.map(renderCheckCard)
            )}
          </div>
        </div>
      </div>

      <CheckDetailDialog
        check={selectedCheck}
        onOpenChange={(open) => !open && setSelectedCheck(null)}
      />
    </AppShell>
  )
}
