"use client"

import { useEffect, useState, useCallback } from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, FileText, Loader2, PlayCircle, Shield, XCircle } from 'lucide-react'
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
  details: any
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
const getStatusIcon = (status: string) => {
  switch (status) {
    case "compliant":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "non_compliant":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Shield className="h-4 w-4 text-gray-600" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "compliant":
      return "default"
    case "warning":
      return "secondary"
    case "non_compliant":
      return "destructive"
    default:
      return "outline"
  }
}

const formatDate = (d: string | null) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString()
}

const statusLabel = (s: string) => s.replace(/_/g, "-")

// ── Component ────────────────────────────────────────────────────────────────
export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [summary, setSummary] = useState<ComplianceSummary>({
    totalRulesChecked: 0, compliant: 0, warning: 0, nonCompliant: 0, overallScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err: any) {
      setError(err?.message || "Failed to load compliance data")
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
    } catch (err: any) {
      console.error("[compliance] run error:", err)
    } finally {
      setRunning(false)
    }
  }

  const compliantItems = checks.filter((c) => c.status === "compliant")
  const warningItems = checks.filter((c) => c.status === "warning")
  const nonCompliantItems = checks.filter((c) => c.status === "non_compliant")

  const getBorderClass = (status: string) => {
    if (status === "warning") return "border-l-4 border-l-yellow-500"
    if (status === "non_compliant") return "border-l-4 border-l-red-500"
    return ""
  }

  const renderCheckCard = (item: ComplianceCheck) => (
    <Card key={item.id} className={getBorderClass(item.status)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {getStatusIcon(item.status)}
            <div className="space-y-1">
              <CardTitle className="text-base">{item.rule_title}</CardTitle>
              <CardDescription>
                {item.regulation} · {item.products_checked} products checked, {item.products_failed} failed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(item.status) as any}>{statusLabel(item.status)}</Badge>
            <div className="text-right text-sm">
              <div className="font-semibold">{item.score}%</div>
              <Progress value={item.score} className="w-16 h-2" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            Checked: {formatDate(item.checked_at)} · Next review: {formatDate(item.next_review)}
          </div>
          <Button variant="outline" size="sm">
            <FileText className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardHeader>
    </Card>
  )

  const renderEmpty = (label: string) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )

  return (
    <AppShell title="Compliance">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
            <p className="text-muted-foreground">Monitor regulatory compliance and certification status</p>
          </div>
          <Button onClick={runComplianceCheck} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Run Compliance Check
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.overallScore}%</div>
              <Progress value={summary.overallScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.compliant}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.nonCompliant}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Items ({checks.length})</TabsTrigger>
            <TabsTrigger value="compliant">Compliant ({compliantItems.length})</TabsTrigger>
            <TabsTrigger value="warning">Warnings ({warningItems.length})</TabsTrigger>
            <TabsTrigger value="non_compliant">Non-Compliant ({nonCompliantItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : checks.length === 0 ? (
              renderEmpty("No compliance checks yet. Run a check to see results.")
            ) : (
              checks.map(renderCheckCard)
            )}
          </TabsContent>

          <TabsContent value="compliant" className="space-y-4">
            {compliantItems.length === 0 ? renderEmpty("No compliant checks") : compliantItems.map(renderCheckCard)}
          </TabsContent>

          <TabsContent value="warning" className="space-y-4">
            {warningItems.length === 0 ? renderEmpty("No warning checks") : warningItems.map(renderCheckCard)}
          </TabsContent>

          <TabsContent value="non_compliant" className="space-y-4">
            {nonCompliantItems.length === 0 ? renderEmpty("No non-compliant checks") : nonCompliantItems.map(renderCheckCard)}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
