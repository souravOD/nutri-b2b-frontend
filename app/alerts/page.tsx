"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Bell, CheckCircle, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/backend"

// ── Types ────────────────────────────────────────────────────────────────────
interface Alert {
  id: string
  vendor_id: string
  type: "quality" | "compliance" | "ingestion" | "match" | "system"
  priority: "high" | "medium" | "low"
  title: string
  description: string | null
  status: "unread" | "read" | "dismissed"
  source_table: string | null
  source_id: string | null
  created_at: string
  read_at: string | null
}

interface AlertSummary {
  total: number
  unread: number
  highPriority: number
  highPriorityUnread: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getViewDetailsHref(alert: Alert): string | null {
  const { source_table, source_id } = alert
  if (!source_table || !source_id) return null
  const table = source_table.toLowerCase()
  // ingestion/orchestration_runs: link to jobs list (no /jobs/[id] route exists)
  if (table === "ingestion" || table === "orchestration_runs") return `/jobs?run=${source_id}`
  if (table === "b2b_customers") return `/customers/${source_id}`
  if (table === "products") return `/products/${source_id}`
  return null
}

function getAlertIconBox(alert: Alert) {
  const isHigh = alert.priority === "high" || alert.type === "ingestion"
  const isMatch = alert.type === "match"
  const bg = isHigh ? "bg-[#fee2e2]" : isMatch ? "bg-[#d1fae5]" : "bg-[#f1f5f9]"
  const icon = isHigh ? (
    <AlertTriangle className="h-5 w-5 text-[#b91c1c]" />
  ) : isMatch ? (
    <CheckCircle className="h-5 w-5 text-[#059669]" />
  ) : (
    <Bell className="h-5 w-5 text-[#64748b]" />
  )
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      {icon}
    </div>
  )
}

function getPriorityPill(priority: string) {
  switch (priority) {
    case "high":
      return (
        <span className="rounded-[4px] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.5px] uppercase bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c]">
          HIGH
        </span>
      )
    case "medium":
      return (
        <span className="rounded-[4px] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.5px] uppercase bg-[#1e293b] text-white">
          MEDIUM
        </span>
      )
    case "low":
      return (
        <span className="rounded-[4px] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.5px] uppercase bg-[#f1f5f9] text-[#64748b]">
          LOW
        </span>
      )
    default:
      return null
  }
}

function getNewPill() {
  return (
    <span className="rounded-[4px] border border-[#00438f] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.5px] uppercase text-[#00438f] bg-white">
      NEW
    </span>
  )
}

const formatTimestamp = (ts: string) => {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString()
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({
    total: 0,
    unread: 0,
    highPriority: 0,
    highPriorityUnread: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all")

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [alertsRes, summaryRes] = await Promise.all([
        apiFetch("/api/alerts?limit=50"),
        apiFetch("/api/alerts/summary"),
      ])
      const alertsJson = await alertsRes.json()
      const summaryJson = await summaryRes.json()
      setAlerts(alertsJson.data || [])
      setSummary(summaryJson)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load alerts"
      console.error("[alerts] fetch error:", err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const markAllAsRead = async () => {
    if (summary.unread === 0) return
    try {
      setMarkAllLoading(true)
      const res = await apiFetch("/api/alerts/mark-all-read", { method: "POST" })
      if (res.ok) {
        await fetchAlerts()
      }
    } catch (err) {
      console.error("[alerts] mark-all-read error:", err)
    } finally {
      setMarkAllLoading(false)
    }
  }

  const updateAlertStatus = async (alertId: string, status: "read" | "dismissed") => {
    try {
      setUpdatingId(alertId)
      const res = await apiFetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        await fetchAlerts()
      }
    } catch (err) {
      console.error("[alerts] update error:", err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleViewDetails = (alert: Alert) => {
    const href = getViewDetailsHref(alert)
    if (href) {
      if (alert.status === "unread") {
        updateAlertStatus(alert.id, "read").then(() => router.push(href))
      } else {
        router.push(href)
      }
    }
  }

  const unreadAlerts = alerts.filter((a) => a.status === "unread")
  const readAlerts = alerts.filter((a) => a.status === "read")
  const displayedAlerts =
    activeTab === "all" ? alerts : activeTab === "unread" ? unreadAlerts : readAlerts

  const renderAlertCard = (alert: Alert) => {
    const viewDetailsHref = getViewDetailsHref(alert)
    return (
      <Card
        key={alert.id}
        className="border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white"
      >
        <CardContent className="p-[25px]">
          <div className="flex gap-4">
            {getAlertIconBox(alert)}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                  <h3 className="text-[14px] font-bold text-[#0f172a]">{alert.title}</h3>
                  {getPriorityPill(alert.priority)}
                  {alert.status === "unread" && getNewPill()}
                </div>
                <p className="text-[12px] font-medium text-[#94a3b8] shrink-0">{formatTimestamp(alert.created_at)}</p>
              </div>
              {alert.description && (
                <p className="text-[14px] text-[#475569] mt-1">{alert.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                {viewDetailsHref && (
                  <Button
                    size="sm"
                    className="bg-[#00438f] hover:bg-[#003366]"
                    disabled={updatingId === alert.id}
                    onClick={() => handleViewDetails(alert)}
                  >
                    View Details
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#e2e8f0] bg-[#f1f5f9] hover:bg-[#e2e8f0]"
                  disabled={updatingId === alert.id || alert.status === "dismissed"}
                  onClick={() => updateAlertStatus(alert.id, "dismissed")}
                >
                  {updatingId === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Dismiss"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <AppShell title="Alerts">
      <div className="container mx-auto p-10 space-y-8 bg-[#f8fafc] min-h-screen">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[12px]">
          <Link href="/dashboard" className="font-medium text-[#64748b] hover:text-[#0f172a]">
            Portal
          </Link>
          <span className="text-[#64748b]">/</span>
          <span className="font-medium text-[#0f172a]">Alerts</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.9px]">Alerts</h1>
            <p className="text-[16px] text-[#64748b]">
              Stay updated with important notifications and system events.
            </p>
          </div>
          <Button
            variant="outline"
            className="bg-[#f1f5f9] border-[#e2e8f0] hover:bg-[#e2e8f0]"
            disabled={summary.unread === 0 || markAllLoading}
            onClick={markAllAsRead}
          >
            {markAllLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Mark All as Read
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#64748b] tracking-[0.7px] uppercase">Total Alerts</p>
                <p className="text-2xl font-bold text-[#0f172a] mt-1">{summary.total}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(0,67,143,0.1)]">
                <Bell className="h-6 w-6 text-[#00438f]" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#64748b] tracking-[0.7px] uppercase">Unread</p>
                <p className="text-2xl font-bold text-[#0f172a] mt-1">{summary.unread}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#fef3c7]">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#64748b] tracking-[0.7px] uppercase">High Priority</p>
                <p className="text-2xl font-bold text-[#0f172a] mt-1">{summary.highPriority}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#fee2e2]">
                <AlertCircle className="h-6 w-6 text-[#b91c1c]" />
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
              All Alerts ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "unread"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Unread ({unreadAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("read")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "read"
                  ? "border-[#00438f] text-[#00438f] font-bold"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Read ({readAlerts.length})
            </button>
          </div>

          {/* Alert List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#64748b]" />
              </div>
            ) : displayedAlerts.length === 0 ? (
              <Card className="border border-[#e2e8f0] rounded-[12px] bg-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-[#94a3b8] mb-4" />
                  <p className="text-[#64748b]">
                    {activeTab === "unread"
                      ? "All caught up — no unread alerts"
                      : activeTab === "read"
                        ? "No read alerts"
                        : "No alerts to display"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayedAlerts.map(renderAlertCard)
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
