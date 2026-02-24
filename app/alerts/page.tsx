"use client"

import { useEffect, useState, useCallback } from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Bell, CheckCircle, Clock, ShieldCheck, Upload, XCircle, Loader2 } from 'lucide-react'
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
const getAlertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "quality":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "compliance":
      return <ShieldCheck className="h-4 w-4 text-blue-600" />
    case "ingestion":
      return <Upload className="h-4 w-4 text-purple-600" />
    case "match":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "system":
      return <Bell className="h-4 w-4 text-gray-600" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "outline"
  }
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
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, unread: 0, highPriority: 0, highPriorityUnread: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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
    } catch (err: any) {
      console.error("[alerts] fetch error:", err)
      setError(err?.message || "Failed to load alerts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const updateAlertStatus = async (alertId: string, status: "read" | "dismissed") => {
    try {
      setUpdatingId(alertId)
      const res = await apiFetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        // Re-fetch to get fresh data
        await fetchAlerts()
      }
    } catch (err: any) {
      console.error("[alerts] update error:", err)
    } finally {
      setUpdatingId(null)
    }
  }

  const unreadAlerts = alerts.filter((a) => a.status === "unread")
  const readAlerts = alerts.filter((a) => a.status === "read")

  const renderAlertCard = (alert: Alert) => (
    <Card key={alert.id} className={alert.status === "unread" ? "border-l-4 border-l-blue-500" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {getAlertIcon(alert.type)}
            <div className="space-y-1">
              <CardTitle className="text-base">{alert.title}</CardTitle>
              {alert.description && <CardDescription>{alert.description}</CardDescription>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityColor(alert.priority) as any}>{alert.priority}</Badge>
            {alert.status === "unread" && <Badge variant="outline">New</Badge>}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(alert.created_at)}</span>
          </div>
          <div className="flex space-x-2">
            {alert.status === "unread" && (
              <Button
                variant="outline"
                size="sm"
                disabled={updatingId === alert.id}
                onClick={() => updateAlertStatus(alert.id, "read")}
              >
                {updatingId === alert.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Read"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={updatingId === alert.id || alert.status === "dismissed"}
              onClick={() => updateAlertStatus(alert.id, "dismissed")}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )

  return (
    <AppShell title="Alerts">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">Stay updated with important notifications and system events</p>
          </div>
          <Button onClick={fetchAlerts} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.highPriority}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadAlerts.length})</TabsTrigger>
            <TabsTrigger value="read">Read ({readAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alerts to display</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map(renderAlertCard)
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {unreadAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">All caught up — no unread alerts</p>
                </CardContent>
              </Card>
            ) : (
              unreadAlerts.map(renderAlertCard)
            )}
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            {readAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No read alerts</p>
                </CardContent>
              </Card>
            ) : (
              readAlerts.map(renderAlertCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
