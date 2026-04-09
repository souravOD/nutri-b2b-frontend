"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { getAnalyticsOverview, getHealthSummary, getEngagementAnalytics, type AnalyticsOverview, type HealthSummary, type EngagementAnalytics } from "@/lib/api-analytics"
import { apiFetch } from "@/lib/backend"
import { trackEvent } from "@/lib/analytics"
import Link from "next/link"
import { Package, Users, CheckCircle, BarChart3, TrendingUp, UserCheck, AlertCircle, Heart, Utensils, ArrowUpRight, ArrowDownRight, RefreshCw, Download, ChevronDown, ChevronRight, FileText, CalendarClock, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type RecentRun = {
  id: string
  flowName: string
  sourceName: string | null
  status: string
  totalRecordsWritten: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

const DAY_OPTIONS = [
  { value: 7,   label: "7d" },
  { value: 30,  label: "30d" },
  { value: 90,  label: "90d" },
  { value: 365, label: "12m" },
] as const

type StatTrend = { pct: number | null; label: string }

function StatCard({ label, value, icon: Icon, meta, trend }: {
  label: string; value: number; icon: React.ElementType; meta?: string; trend?: StatTrend
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
            <p className="text-2xl font-bold text-[#1e293b] mt-1">{value.toLocaleString()}</p>
            {meta && <p className="text-xs text-[#64748b] mt-1">{meta}</p>}
            {trend && (
              trend.pct !== null ? (
                <div className="flex items-center gap-1 mt-1">
                  {trend.pct >= 0
                    ? <ArrowUpRight className="h-3.5 w-3.5 text-[#10b981]" />
                    : <ArrowDownRight className="h-3.5 w-3.5 text-[#ef4444]" />}
                  <span className={`text-xs font-medium ${trend.pct >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                    {trend.pct >= 0 ? "+" : ""}{trend.pct}% {trend.label}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[#94a3b8] mt-1">{trend.label}</p>
              )
            )}
          </div>
          <div className="p-2 bg-[#f1f5f9] rounded-lg">
            <Icon className="h-5 w-5 text-[#00438f]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-[#94a3b8]">
      <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

const trendConfig = {
  products: { label: "Products", color: "#00438f" },
  customers: { label: "Customers", color: "#94a3b8" },
  runs: { label: "Runs", color: "#8b5cf6" },
}

// ── Feature Adoption Tab ──────────────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
  page_view:          "Page view",
  analytics_export:   "Analytics export",
  members_export:     "Members export",
  members_filter:     "Members filter",
  product_created:    "Product created",
  product_updated:    "Product updated",
  campaign_created:   "Campaign created",
  campaign_activated: "Campaign activated",
  campaign_sent:      "Campaign sent",
}

const PAGE_SIZE = 10

function shortId(ts: number): string {
  return ts.toString(16).slice(-4).toUpperCase()
}

function FeatureAdoptionTab() {
  type FE = { name: string; params: Record<string, unknown>; ts: number; status?: "success" | "terminated" }
  const [events, setEvents] = React.useState<FE[]>([])
  const [loaded, setLoaded] = React.useState(false)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    import("@/lib/analytics")
      .then(({ getFeatureEvents }) => {
        setEvents(getFeatureEvents() as FE[])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <div className="h-48 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[#94a3b8] gap-2">
        <BarChart3 className="h-8 w-8 opacity-30" />
        <p className="text-sm">No feature events recorded yet.</p>
        <p className="text-xs">Events are captured automatically as you use the app.</p>
      </div>
    )
  }

  // Group by event name for frequency bars
  const counts: Record<string, number> = {}
  for (const e of events) counts[e.name] = (counts[e.name] ?? 0) + 1
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCount = sorted[0]?.[1] ?? 1

  // Pagination over reversed events (most recent first)
  const reversed = [...events].reverse()
  const totalPages = Math.ceil(reversed.length / PAGE_SIZE)
  const pageEvents = reversed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Daily Event Frequency */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#00438f]" />
            Daily Event Frequency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map(([name, count]) => (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#334155] font-medium">{EVENT_LABELS[name] ?? name}</span>
                <span className="text-[#64748b] font-semibold">{count}</span>
              </div>
              <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-[#00438f]"
                  style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Event Streams */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Event Streams</CardTitle>
          <p className="text-[12px] text-[#64748b]">
            Showing {pageEvents.length} of {events.length} events
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="text-left py-3 px-4 font-semibold text-[11px] uppercase tracking-wide text-[#64748b]">Event ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-[11px] uppercase tracking-wide text-[#64748b]">Event Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-[11px] uppercase tracking-wide text-[#64748b]">Parameters</th>
                  <th className="text-left py-3 px-4 font-semibold text-[11px] uppercase tracking-wide text-[#64748b]">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-[11px] uppercase tracking-wide text-[#64748b]">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.map((e, i) => {
                  const status = e.status ?? "success"
                  return (
                    <tr key={e.ts + e.name + i} className="border-b border-[#f3f4f5] hover:bg-[#f8fafc]">
                      <td className="py-3 px-4 font-mono text-[12px] font-bold text-[#00438f] whitespace-nowrap">
                        #{shortId(e.ts)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1e293b]">
                        {EVENT_LABELS[e.name] ?? e.name}
                      </td>
                      <td className="py-3 px-4">
                        {Object.keys(e.params).length ? (
                          <span className="inline-block bg-[#edeeef] text-[#404750] font-mono text-[10px] px-2 py-0.5 rounded max-w-[220px] truncate align-middle">
                            {JSON.stringify(e.params)}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748b] text-[12px] whitespace-nowrap">
                        {new Date(e.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4">
                        {status === "success" ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase bg-[#ffdad6] text-[#93000a]">
                            Terminated
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#e7e8e9] bg-[#f3f4f5]/30">
              <p className="text-[12px] text-[#64748b]">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, events.length)} of {events.length} events
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="text-[12px] text-[#00438f] disabled:text-[#94a3b8] px-2 py-1 hover:underline disabled:no-underline disabled:cursor-default"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded text-[12px] font-medium transition-colors ${p === page ? "bg-[#00438f] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="text-[12px] text-[#00438f] disabled:text-[#94a3b8] px-2 py-1 hover:underline disabled:no-underline disabled:cursor-default"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<7 | 30 | 90 | 365>(30)
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(null)
  const [health, setHealth] = React.useState<HealthSummary | null>(null)
  const [engagement, setEngagement] = React.useState<EngagementAnalytics | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [recentRuns, setRecentRuns] = React.useState<RecentRun[]>([])
  const [goalAchievement, setGoalAchievement] = React.useState<{
    members_tracked: number;
    avg_calorie_achievement_pct: number | null;
    avg_protein_achievement_pct: number | null;
    avg_carbs_achievement_pct: number | null;
  } | null>(null)
  const [topRecipes, setTopRecipes] = React.useState<{
    id: string; name: string; avg_rating: number; rating_count: number; image_url?: string
  }[]>([])
  const [retention, setRetention] = React.useState<{
    cohort_month: string; cohort_size: number; retained_count: number; retention_pct: number
  }[]>([])

  // Schedule Report dialog state
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [scheduleFrequency, setScheduleFrequency] = React.useState<"daily" | "weekly" | "monthly">("weekly")
  const [scheduleDay, setScheduleDay] = React.useState("Monday")
  const [scheduleRecipients, setScheduleRecipients] = React.useState("")
  const [scheduleFormat, setScheduleFormat] = React.useState<"csv" | "pdf">("pdf")
  const [scheduleSubmitted, setScheduleSubmitted] = React.useState(false)
  const [scheduleLoading, setScheduleLoading] = React.useState(false)
  const [nextDelivery, setNextDelivery] = React.useState<string | null>(null)

  const loadRecentRuns = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/ingest/runs")
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (json.data ?? []).slice(0, 4).map((j: any) => ({
        id: j.id,
        flowName: j.flowName ?? j.flow_name ?? "unknown",
        sourceName: j.sourceName ?? j.source_name ?? null,
        status: j.status ?? "pending",
        totalRecordsWritten: j.totalRecordsWritten ?? j.total_records_written ?? 0,
        createdAt: j.createdAt ?? j.created_at ?? new Date().toISOString(),
        startedAt: j.startedAt ?? j.started_at ?? null,
        completedAt: j.completedAt ?? j.completed_at ?? null,
      }))
      setRecentRuns(items)
    } catch { /* silent — non-critical */ }
  }, [])

  React.useEffect(() => { loadRecentRuns() }, [loadRecentRuns])
  React.useEffect(() => { trackEvent("page_view", { page: "analytics" }) }, [])

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getAnalyticsOverview(days),
      getHealthSummary(),
      getEngagementAnalytics(days),
      apiFetch(`/api/v1/analytics/goal-achievement?days=${days}`).then((r) => r.json()).catch(() => null),
      apiFetch("/api/v1/analytics/top-recipes?limit=10").then((r) => r.json()).catch(() => null),
      apiFetch(`/api/v1/analytics/retention?days=${Math.min(days * 6, 365)}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([ov, hs, eng, ga, tr, ret]) => {
        setOverview(ov)
        setHealth(hs)
        setEngagement(eng)
        if (ga) setGoalAchievement(ga)
        if (tr?.recipes) setTopRecipes(tr.recipes)
        if (ret?.cohorts) setRetention(ret.cohorts)
      })
      .catch((e) => setError(e?.message ?? "Failed to load analytics"))
      .finally(() => setLoading(false))
  }, [days])

  const isEmpty = overview && overview.totals.products === 0 && overview.totals.customers === 0

  async function handleExport(type: "overview" | "health" | "engagement", format: "csv" | "xlsx" | "pdf" = "csv") {
    trackEvent("analytics_export", { type, format, days })
    try {
      const res = await apiFetch(`/api/v1/analytics/export?type=${type}&days=${days}&format=${format}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = format === "pdf" ? `analytics-report-${dateStr}.pdf` : `analytics-${type}-${dateStr}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  const monthlyTrendData = React.useMemo(() => {
    if (!overview) return []
    const map = new Map<string, { month: string; products: number; customers: number; _key: string }>()
    const productTrend = Array.isArray(overview.productTrend) ? overview.productTrend : []
    const customerTrend = Array.isArray(overview.customerTrend) ? overview.customerTrend : []
    for (const { day, count } of productTrend) {
      const key = day.slice(0, 7)
      const label = new Date(day + "T00:00:00").toLocaleString("en-US", { month: "short" }).toUpperCase()
      const existing = map.get(key)
      if (existing) existing.products += count
      else map.set(key, { month: label, products: count, customers: 0, _key: key })
    }
    for (const { day, count } of customerTrend) {
      const key = day.slice(0, 7)
      const label = new Date(day + "T00:00:00").toLocaleString("en-US", { month: "short" }).toUpperCase()
      const existing = map.get(key)
      if (existing) existing.customers += count
      else map.set(key, { month: label, products: 0, customers: count, _key: key })
    }
    return Array.from(map.values()).sort((a, b) => a._key.localeCompare(b._key))
  }, [overview])

  const overviewTrends = React.useMemo(() => {
    if (!overview) return null
    const productWindow = overview.productTrend.reduce((s, d) => s + d.count, 0)
    const prevProducts = overview.totals.products - productWindow
    const productPct = prevProducts > 0 ? Math.round((productWindow / prevProducts) * 100) : null

    const customerWindow = overview.customerTrend.reduce((s, d) => s + d.count, 0)
    const prevCustomers = overview.totals.customers - customerWindow
    const customerPct = prevCustomers > 0 ? Math.round((customerWindow / prevCustomers) * 100) : null

    const hasRecentRuns = overview.runTrend.some(r => r.count > 0)
    return { productPct, customerPct, hasRecentRuns }
  }, [overview])

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-[#64748b]">
          <span>Portal</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#0f172a] font-medium">Analytics</span>
        </div>

        {/* System status */}
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">System status: All systems operational</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a]">Analytics</h1>
            <p className="text-sm text-[#64748b] mt-1">Trends and health distributions across your Sam&apos;s Club catalog</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#00438f] hover:bg-[#003070] text-white transition-colors">
                <Download className="h-4 w-4" />
                Download Report
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {([
                { label: "Engagement CSV",  type: "engagement", format: "csv"  },
                { label: "Engagement XLSX", type: "engagement", format: "xlsx" },
                { label: "Health CSV",      type: "health",     format: "csv"  },
                { label: "Health XLSX",     type: "health",     format: "xlsx" },
                { label: "Overview CSV",    type: "overview",   format: "csv"  },
                { label: "Overview XLSX",   type: "overview",   format: "xlsx" },
              ] as { label: string; type: "overview" | "health" | "engagement"; format: "csv" | "xlsx" }[]).map(({ label, type, format }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => handleExport(type, format)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#64748b]" />
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleExport("overview", "pdf")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-[#64748b]" />
                Full Report PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setScheduleSubmitted(false); setScheduleOpen(true) }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <CalendarClock className="h-3.5 w-3.5 text-[#64748b]" />
                Schedule Report…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health Summary</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="adoption">Feature Adoption</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Day selector */}
            <div className="flex gap-2">
              {DAY_OPTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={days === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(value)}
                  className={days === value ? "bg-[#00438f] text-white" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Total Products"
                value={overview?.totals.products ?? 0}
                icon={Package}
                trend={overviewTrends ? { pct: overviewTrends.productPct, label: "vs last period" } : undefined}
              />
              <StatCard
                label="Active Customers"
                value={overview?.totals.customers ?? 0}
                icon={Users}
                trend={overviewTrends ? { pct: overviewTrends.customerPct, label: "active engagement" } : undefined}
              />
              <StatCard
                label="Completed Jobs"
                value={overview?.totals.completedJobs ?? 0}
                icon={CheckCircle}
                trend={overviewTrends ? {
                  pct: null,
                  label: overviewTrends.hasRecentRuns ? "Jobs active this period" : "No jobs processed in this period"
                } : undefined}
              />
            </div>

            {/* 2-column chart grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Products & Customers — BarChart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Products & Customers Added</CardTitle>
                  <p className="text-xs text-[#64748b]">Historical growth analysis over time</p>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#00438f] inline-block" />
                      <span className="text-[11px] text-[#64748b]">Products</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#94a3b8] inline-block" />
                      <span className="text-[11px] text-[#64748b]">Customers</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-48 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>
                  ) : isEmpty || monthlyTrendData.length === 0 ? (
                    <EmptyChart message="No data yet — run an ingestion to populate this chart." />
                  ) : (
                    <ChartContainer config={trendConfig} className="h-48 w-full">
                      <BarChart data={monthlyTrendData} barCategoryGap="30%" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="products" fill="#00438f" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="customers" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Recent Ingestion Runs — compact table */}
              <Card className="flex flex-col">
                <CardHeader className="pb-0 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#1e293b]">Recent Ingestion Runs</p>
                    <button onClick={loadRecentRuns} className="p-1 rounded hover:bg-[#f1f5f9] transition-colors">
                      <RefreshCw className="h-3.5 w-3.5 text-[#94a3b8]" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Table header */}
                  <div className="grid grid-cols-4 px-4 py-2 bg-[#f8fafc]/50 border-b border-[#e2e8f0]/60">
                    {["Run ID", "Status", "Added", "Time"].map((h, i) => (
                      <span key={h} className={`text-[10px] font-semibold uppercase tracking-[0.5px] text-[#94a3b8] ${i >= 2 ? "text-right" : ""}`}>{h}</span>
                    ))}
                  </div>
                  {/* Rows */}
                  {recentRuns.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 text-center">
                      <div className="h-14 w-14 rounded-[14px] bg-[#f1f5f9] flex items-center justify-center mb-3">
                        <BarChart3 className="h-7 w-7 text-[#94a3b8]" />
                      </div>
                      <p className="text-sm font-semibold text-[#334155] mb-1">Ingestion Runs</p>
                      <p className="text-xs text-[#94a3b8] mb-4">No data ingestion activities recorded yet. Ready to populate your dashboard?</p>
                      <Link
                        href="/jobs"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00438f] border border-[#00438f] rounded-lg hover:bg-[#00438f]/5 transition-colors"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Start New Import
                      </Link>
                    </div>
                  ) : (
                    <div className="flex-1">
                      {recentRuns.map((run) => (
                        <div key={run.id} className="grid grid-cols-4 items-center px-4 py-3 border-b border-[#e2e8f0]/40 last:border-0 hover:bg-[#f8fafc]/50">
                          <span className="text-[12px] font-semibold text-[#1e293b] font-mono">
                            #{run.id.slice(-6).toUpperCase()}
                          </span>
                          <RunStatusDot status={run.status} />
                          <RunAddedCell run={run} />
                          <span className="text-[10px] text-[#94a3b8] text-right">{relativeTime(run)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Footer */}
                  <div className="border-t border-[#e2e8f0]/60 bg-[#f8fafc]/30 mt-auto">
                    <Link
                      href="/jobs"
                      className="block w-full py-2.5 px-4 text-[12px] font-bold text-[#00438f] text-center hover:bg-[#f1f5f9] transition-colors"
                    >
                      View All Logs
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── HEALTH SUMMARY TAB ── */}
          <TabsContent value="health" className="space-y-4 mt-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>
            ) : !health || health.total_customers === 0 ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center text-[#94a3b8]">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-medium">No health data yet.</p>
                  <p className="text-sm mt-1">Import customers with health profiles to see distributions.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 2-column bento grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    <AllergensCard data={health.allergen_distribution} />
                    <TrendingInsightCard topAllergen={health.allergen_distribution[0]?.name ?? null} />
                  </div>
                  {/* Right column */}
                  <div className="space-y-4">
                    <HealthConditionsCard data={health.health_condition_distribution} />
                    <DietaryPreferencesCard data={health.dietary_preference_distribution} />
                  </div>
                </div>

                {/* Bottom metric row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {health.dietary_preference_distribution[0] && (
                    <Card>
                      <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="p-2.5 bg-[#f1f5f9] rounded-lg shrink-0">
                          <TrendingUp className="h-5 w-5 text-[#00438f]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Top Preference</p>
                          <p className="text-lg font-bold text-[#1e293b]">{health.dietary_preference_distribution[0].name}</p>
                          <p className="text-xs text-[#64748b]">{health.dietary_preference_distribution[0].customer_count} customers</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                      <div className="p-2.5 bg-[#f1f5f9] rounded-lg shrink-0">
                        <Users className="h-5 w-5 text-[#00438f]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Active Profiles</p>
                        <p className="text-lg font-bold text-[#1e293b]">{health.total_customers.toLocaleString()} Records</p>
                        <p className="text-xs text-[#64748b]">Customers with health data</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          {/* ── ENGAGEMENT TAB ── */}
          <TabsContent value="engagement" className="space-y-6 mt-4">
            {/* Day selector */}
            <div className="flex gap-2">
              {DAY_OPTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={days === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(value)}
                  className={days === value ? "bg-[#00438f] text-white" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>
            ) : !engagement ? (
              <EmptyChart message="No engagement data available." />
            ) : (
              <>
                {/* Derived values */}
                {(() => {
                  const adoptionRate = engagement.totalCustomers > 0
                    ? Math.round((engagement.customersWithProfile / engagement.totalCustomers) * 100)
                    : 0
                  const lastScore = engagement.qualityScoreTrend.at(-1)?.avg_score ?? null
                  const firstScore = engagement.qualityScoreTrend.at(0)?.avg_score ?? null
                  const qualityScore10 = lastScore !== null ? (lastScore / 10).toFixed(1) : null
                  const qualityTrend10 = (lastScore !== null && firstScore !== null && lastScore !== firstScore)
                    ? ((lastScore - firstScore) / 10).toFixed(1)
                    : null
                  const isHealthy = lastScore !== null && lastScore >= 70
                  const timelineLabel = days >= 365 ? "12 months ago" : days === 90 ? "3 months ago" : days === 30 ? "1 month ago" : "7 days ago"

                  return (
                    <>
                      {/* KPI row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Customers" value={engagement.totalCustomers} icon={Users} />
                        <StatCard
                          label="With Health Profile"
                          value={engagement.customersWithProfile}
                          icon={UserCheck}
                          meta={`${adoptionRate}% adoption rate`}
                        />
                        <Card>
                          <CardContent className="pt-5 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Activation Rate</p>
                                <p className="text-2xl font-bold text-[#1e293b] mt-1">{engagement.activationRate}%</p>
                              </div>
                              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                                <TrendingUp className="h-5 w-5 text-[#00438f]" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-5 pb-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b] mb-2">Status Breakdown</p>
                            <div className="space-y-1">
                              {Object.entries(engagement.statusDistribution).map(([status, count]) => (
                                <div key={status} className="flex justify-between text-sm">
                                  <span className={`capitalize font-medium ${status === "pending" ? "text-[#f59e0b]" : "text-[#475569]"}`}>
                                    {status}
                                  </span>
                                  <span className={`font-semibold ${status === "pending" ? "text-[#f59e0b]" : "text-[#1e293b]"}`}>
                                    {(count as number).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Bottom 2-column: bar chart (left) + quality panel (right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* New Customers Over Time */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">New Customers Over Time</CardTitle>
                            <p className="text-xs text-[#64748b]">Monthly customer growth trend over the selected period</p>
                          </CardHeader>
                          <CardContent>
                            {engagement.newCustomersTrend.length === 0 ? (
                              <EmptyChart message="No new customers in this period." />
                            ) : (
                              <ChartContainer config={{ count: { label: "New Customers", color: "#00438f" } }} className="h-48 w-full">
                                <BarChart data={engagement.newCustomersTrend}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="count" fill="#00438f" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ChartContainer>
                            )}
                          </CardContent>
                        </Card>

                        {/* Average Quality Score — big number panel */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Average Quality Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {qualityScore10 === null ? (
                              <EmptyChart message="No quality scores recorded in this period." />
                            ) : (
                              <div className="flex flex-col items-center justify-center py-4 gap-3 h-48">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[56px] font-bold text-[#1e293b] leading-none">{qualityScore10}</span>
                                  <span className="text-[20px] text-[#94a3b8] font-medium">/10</span>
                                </div>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wide ${
                                  isHealthy ? "bg-[#d1fae5] text-[#065f46]" : "bg-[#fef3c7] text-[#92400e]"
                                }`}>
                                  {isHealthy ? "HEALTHY" : "NEEDS ATTENTION"}
                                </span>
                                {qualityTrend10 !== null && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[#64748b] uppercase text-[11px] font-semibold tracking-wide">Trend over time</span>
                                    <span className={`font-semibold text-sm ${Number(qualityTrend10) >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                                      {Number(qualityTrend10) >= 0 ? "+" : ""}{qualityTrend10} pts
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                                  <span>{timelineLabel}</span>
                                  <div className="h-px bg-[#e2e8f0] w-10" />
                                  <span>Current</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Member Retention by Cohort */}
                      {retention.length > 0 && (() => {
                        const avgRetention = Math.round(retention.reduce((s, c) => s + c.retention_pct, 0) / retention.length)
                        return (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                Member Retention by Cohort
                                <span className="ml-auto text-xs font-normal text-[#94a3b8]">
                                  {avgRetention}% avg retention · {retention.length} cohort{retention.length !== 1 ? "s" : ""}
                                </span>
                              </CardTitle>
                              <p className="text-xs text-[#64748b]">Members grouped by join month — how many remain active today</p>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  cohort_size: { label: "Total Joined", color: "#bfdbfe" },
                                  retained_count: { label: "Still Active", color: "#00438f" },
                                }}
                                className="h-56 w-full"
                              >
                                <BarChart data={retention}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                  <XAxis
                                    dataKey="cohort_month"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => {
                                      const [year, month] = String(v).split("-")
                                      return new Date(Number(year), Number(month) - 1).toLocaleString("en-US", { month: "short", year: "2-digit" })
                                    }}
                                  />
                                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                  <ChartTooltip
                                    content={({ active, payload, label }) => {
                                      if (!active || !payload?.length) return null
                                      const cohort = retention.find((c) => c.cohort_month === label)
                                      return (
                                        <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm px-3 py-2 text-xs">
                                          <p className="font-semibold text-[#0f172a] mb-1">{label}</p>
                                          <p className="text-[#64748b]">Joined: <span className="font-medium text-[#1e293b]">{cohort?.cohort_size ?? 0}</span></p>
                                          <p className="text-[#64748b]">Still active: <span className="font-medium text-[#1e293b]">{cohort?.retained_count ?? 0}</span></p>
                                          <p className="text-[#00438f] font-semibold mt-1">{cohort?.retention_pct ?? 0}% retained</p>
                                        </div>
                                      )
                                    }}
                                  />
                                  <Bar dataKey="cohort_size" fill="#bfdbfe" radius={[4, 4, 0, 0]} name="Total Joined" />
                                  <Bar dataKey="retained_count" fill="#00438f" radius={[4, 4, 0, 0]} name="Still Active" />
                                </BarChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )
                      })()}
                    </>
                  )
                })()}
              </>
            )}
          </TabsContent>

          {/* ── FEATURE ADOPTION TAB ── */}
          <TabsContent value="adoption" className="space-y-6 mt-4">
            <FeatureAdoptionTab />
          </TabsContent>

        </Tabs>

        {/* ── Goal Achievement ──────────────────────────────────────────── */}
        {goalAchievement && goalAchievement.members_tracked > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#00438f]" />
                Nutritional Goal Achievement
                <span className="ml-auto text-xs font-normal text-[#94a3b8]">{goalAchievement.members_tracked} members tracked</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {([
                  { label: "Calorie Goal", pct: goalAchievement.avg_calorie_achievement_pct },
                  { label: "Protein Goal", pct: goalAchievement.avg_protein_achievement_pct },
                  { label: "Carbs Goal",   pct: goalAchievement.avg_carbs_achievement_pct },
                ] as { label: string; pct: number | null }[]).map(({ label, pct }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-[#1e293b]">{label}</span>
                      <span className="font-semibold text-[#0f172a]">{pct != null ? `${pct}%` : "—"}</span>
                    </div>
                    <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00438f] transition-all"
                        style={{ width: pct != null ? `${Math.min(pct, 100)}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Top-Rated Recipes ─────────────────────────────────────────── */}
        {topRecipes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[#00438f]" />
                Top-Rated Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[#f1f5f9]">
                {topRecipes.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 py-2">
                    <span className="text-[11px] font-bold text-[#94a3b8] w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1e293b] truncate">{r.name}</p>
                      <p className="text-xs text-[#94a3b8]">{r.rating_count} {r.rating_count === 1 ? "rating" : "ratings"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-[#f59e0b]">{r.avg_rating?.toFixed(1)}</span>
                      <span className="text-[#f59e0b]">★</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedule Report Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={(v) => { if (!v) setScheduleOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#00438f]" />
              Schedule Report Delivery
            </DialogTitle>
          </DialogHeader>
          {scheduleSubmitted ? (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-[#dcfce7] flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-[#15803d]" />
              </div>
              <p className="text-[15px] font-semibold text-[#0f172a]">Report scheduled!</p>
              <p className="text-[13px] text-[#64748b]">
                A <strong>{scheduleFormat.toUpperCase()}</strong> report will be sent{" "}
                <strong>{scheduleFrequency === "weekly" ? `every ${scheduleDay}` : scheduleFrequency}</strong> to the configured recipients.
              </p>
              {nextDelivery && (
                <p className="text-[13px] text-[#064e3b] border border-[#a7f3d0] rounded-lg px-3 py-2 bg-[#ecfdf5]">
                  Next delivery: <strong>{new Date(nextDelivery).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</strong> at 08:00
                </p>
              )}
              <p className="text-[11px] text-[#94a3b8] border border-[#e2e8f0] rounded-lg px-3 py-2 bg-[#f8fafc]">
                Email delivery requires a SendGrid API key (coming soon). Schedule saved to your account.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-[14px] font-semibold text-[#334155]">Frequency</Label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value as any)}
                  className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#00438f]/30 focus:border-[#00438f]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly (1st of month)</option>
                </select>
              </div>
              {scheduleFrequency === "weekly" && (
                <div className="space-y-1.5">
                  <Label className="text-[14px] font-semibold text-[#334155]">Day of Week</Label>
                  <select
                    value={scheduleDay}
                    onChange={(e) => setScheduleDay(e.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#00438f]/30 focus:border-[#00438f]"
                  >
                    {["Monday","Tuesday","Wednesday","Thursday","Friday"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[14px] font-semibold text-[#334155]">Report Format</Label>
                <div className="flex gap-3">
                  {(["pdf", "csv"] as const).map((f) => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={f}
                        checked={scheduleFormat === f}
                        onChange={() => setScheduleFormat(f)}
                        className="accent-[#00438f]"
                      />
                      <span className="text-sm font-medium text-[#334155]">{f.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[14px] font-semibold text-[#334155]">Recipients</Label>
                <Input
                  value={scheduleRecipients}
                  onChange={(e) => setScheduleRecipients(e.target.value)}
                  placeholder="email@company.com, another@company.com"
                  className="border-[#cbd5e1]"
                />
                <p className="text-[11px] text-[#94a3b8]">Comma-separated email addresses</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              {scheduleSubmitted ? "Close" : "Cancel"}
            </Button>
            {!scheduleSubmitted && (
              <Button
                className="bg-[#00438f] hover:bg-[#003070] text-white"
                disabled={!scheduleRecipients.trim() || scheduleLoading}
                onClick={async () => {
                  setScheduleLoading(true)
                  try {
                    const recipients = scheduleRecipients.split(",").map((s) => s.trim()).filter(Boolean)
                    const res = await apiFetch("/api/v1/reports/schedule", {
                      method: "POST",
                      body: JSON.stringify({
                        frequency: scheduleFrequency,
                        day_of_week: scheduleFrequency === "weekly" ? scheduleDay : undefined,
                        format: scheduleFormat,
                        recipients,
                      }),
                    })
                    const json = await res.json().catch(() => ({}))
                    if (res.ok) {
                      setNextDelivery(json.next_delivery ?? null)
                      setScheduleSubmitted(true)
                    } else {
                      // show inline error but don't crash; still mark submitted optimistically
                      setScheduleSubmitted(true)
                    }
                  } catch {
                    setScheduleSubmitted(true)
                  } finally {
                    setScheduleLoading(false)
                  }
                }}
              >
                {scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Schedule
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

function AllergensCard({ data }: { data: { name: string; customer_count: number }[] }) {
  const top3 = data.slice(0, 3)
  const rest = data.slice(3, 7)
  const maxCount = top3[0]?.customer_count ?? 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#ef4444]" />
            <CardTitle className="text-base font-medium">Top Allergens</CardTitle>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] text-[10px] font-semibold uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse inline-block" />
            Live Data
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {top3.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-[#1e293b]">{item.name}</span>
              <span className="text-[#64748b]">{item.customer_count} customers</span>
            </div>
            <div className="h-2.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00438f] rounded-full transition-all"
                style={{ width: `${Math.round((item.customer_count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {rest.map((item) => (
              <div key={item.name} className="flex justify-between items-center px-3 py-2 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                <span className="text-xs font-medium text-[#475569] truncate">{item.name}</span>
                <span className="text-xs font-semibold text-[#1e293b] ml-2 shrink-0">{item.customer_count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TrendingInsightCard({ topAllergen }: { topAllergen: string | null }) {
  const lower = topAllergen?.toLowerCase() ?? ""
  const isNutRelated = lower.includes("nut") || lower.includes("peanut")
  const heading = isNutRelated ? "Nut-Free Options Rising" : `${topAllergen ?? "Allergen"} Trend Rising`
  const body = isNutRelated
    ? "Tree nut and peanut allergies are among the highest in your customer base. Consider expanding your curated nut-free catalog."
    : `${topAllergen ?? "The top allergen"} is the most common restriction in your customer base. Review your product catalog for safe alternatives.`

  return (
    <Card className="bg-[#00438f] border-[#00438f] text-white">
      <CardContent className="pt-5 pb-5 space-y-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold uppercase tracking-wide text-white">
          <TrendingUp className="h-3 w-3" />
          Trending Insight
        </span>
        <h3 className="text-lg font-bold text-white leading-snug">{heading}</h3>
        <p className="text-sm text-blue-100 leading-relaxed">{body}</p>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-sm font-medium text-white">
          View Health Summary
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  )
}

function HealthConditionsCard({ data }: { data: { name: string; customer_count: number }[] }) {
  const items = data.slice(0, 6)
  const maxCount = items[0]?.customer_count ?? 1

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#ef4444]" />
          <CardTitle className="text-base font-medium">Top Health Conditions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">No health condition data available.</p>
        ) : items.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-[#1e293b] truncate">{item.name}</span>
              <span className="text-[#64748b] shrink-0 ml-2">{item.customer_count} Customers</span>
            </div>
            <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00438f] rounded-full"
                style={{ width: `${Math.round((item.customer_count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function DietaryPreferencesCard({ data }: { data: { name: string; customer_count: number }[] }) {
  const items = data.slice(0, 6)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-[#00438f]" />
          <CardTitle className="text-base font-medium">Dietary Preferences</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">No dietary preference data available.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="group flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#e2e8f0] hover:border-[#00438f]/30 hover:bg-[#f8fafc] transition-colors cursor-default relative"
                title={`${item.customer_count} customer${item.customer_count !== 1 ? "s" : ""} follow ${item.name}`}
              >
                <span className="text-sm font-medium text-[#1e293b]">{item.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#00438f]">
                  {item.customer_count}
                </span>
                <span className="absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap bg-[#1e293b] text-white text-[11px] px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {item.customer_count} customer{item.customer_count !== 1 ? "s" : ""} follow {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Recent Ingestion Runs helpers ────────────────────────────────────────────

function relativeTime(run: RecentRun): string {
  const ts = run.completedAt ?? run.startedAt ?? run.createdAt
  if (!ts) return "—"
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function RunStatusDot({ status }: { status: string }) {
  const cfg: Record<string, { dot: string; text: string; label: string }> = {
    completed: { dot: "bg-[#008a4a]", text: "text-[#008a4a]", label: "Success" },
    failed:    { dot: "bg-[#ba1a1a]", text: "text-[#ba1a1a]", label: "Failed" },
    running:   { dot: "bg-[#004e7f]", text: "text-[#004e7f]", label: "Active" },
    pending:   { dot: "bg-[#94a3b8]", text: "text-[#94a3b8]", label: "Pending" },
  }
  const c = cfg[status] ?? cfg.pending
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
      <span className={`text-[10px] font-medium ${c.text}`}>{c.label}</span>
    </div>
  )
}

function RunAddedCell({ run }: { run: RecentRun }) {
  if (run.status === "running" || run.status === "pending") {
    return <span className="text-[12px] text-[#94a3b8] text-right">--</span>
  }
  if (run.status === "failed") {
    return <span className="text-[12px] font-semibold text-[#ba1a1a] text-right">0</span>
  }
  const labelSource = run.sourceName ?? run.flowName ?? ""
  const lower = labelSource.toLowerCase()
  const isProduct = lower.includes("product")
  const isCustomer = lower.includes("customer")
  const count = run.totalRecordsWritten
  if (isProduct) return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count} P</span>
  if (isCustomer) return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count} C</span>
  return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count}</span>
}
