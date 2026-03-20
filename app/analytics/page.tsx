"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { getAnalyticsOverview, getHealthSummary, getEngagementAnalytics, type AnalyticsOverview, type HealthSummary, type EngagementAnalytics } from "@/lib/api-analytics"
import { apiFetch } from "@/lib/backend"
import Link from "next/link"
import { Package, Users, CheckCircle, BarChart3, TrendingUp, UserCheck, AlertCircle, Heart, Utensils, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"

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

const healthConfig = {
  customer_count: { label: "Customers", color: "#00438f" },
}

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<7 | 30 | 90 | 365>(30)
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(null)
  const [health, setHealth] = React.useState<HealthSummary | null>(null)
  const [engagement, setEngagement] = React.useState<EngagementAnalytics | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [recentRuns, setRecentRuns] = React.useState<RecentRun[]>([])

  const loadRecentRuns = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/ingest/runs")
      const json = await res.json()
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

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getAnalyticsOverview(days), getHealthSummary(), getEngagementAnalytics(days)])
      .then(([ov, hs, eng]) => {
        setOverview(ov)
        setHealth(hs)
        setEngagement(eng)
      })
      .catch((e) => setError(e?.message ?? "Failed to load analytics"))
      .finally(() => setLoading(false))
  }, [days])

  // Merge productTrend + customerTrend by day for combo chart
  const trendData = React.useMemo(() => {
    if (!overview) return []
    const map = new Map<string, { day: string; products: number; customers: number }>()
    for (const { day, count } of overview.productTrend) {
      map.set(day, { day, products: count, customers: 0 })
    }
    for (const { day, count } of overview.customerTrend) {
      const existing = map.get(day)
      if (existing) existing.customers = count
      else map.set(day, { day, products: 0, customers: count })
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day))
  }, [overview])

  const runData = React.useMemo(() => {
    if (!overview) return []
    return overview.runTrend.map((r) => ({ day: r.day, runs: r.count }))
  }, [overview])

  const isEmpty = overview && overview.totals.products === 0 && overview.totals.customers === 0

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1e293b]">Analytics</h1>
            <p className="text-sm text-[#64748b] mt-1">Trends and health distributions across your catalog</p>
          </div>
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
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
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
                  ) : isEmpty || trendData.length === 0 ? (
                    <EmptyChart message="No data yet — run an ingestion to populate this chart." />
                  ) : (
                    <ChartContainer config={trendConfig} className="h-48 w-full">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="gradProducts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00438f" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#00438f" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradCustomers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="products" stroke="#00438f" strokeWidth={2} fill="url(#gradProducts)" dot={false} />
                        <Area type="monotone" dataKey="customers" stroke="#94a3b8" strokeWidth={2} fill="url(#gradCustomers)" dot={false} />
                      </AreaChart>
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
                    <div className="flex-1 flex items-center justify-center h-40 text-[12px] text-[#94a3b8]">
                      No ingestion runs yet.
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
                    </>
                  )
                })()}
              </>
            )}
          </TabsContent>

          {/* ── DASHBOARD TAB ── */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">

            {/* KPI Row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <DashKpiCard label="Total Members" value={overview?.totals.customers ?? null} />
              <DashKpiCard label="DAU / MAU Ratio" value={null} unit="%" />
              <DashKpiCard label="Retention Rate" value={null} unit="%" />
              <DashKpiCard label="NPS Score" value={null} />
            </div>

            {/* 2-column: Health + Shopping */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT — Health & Nutrition Insights */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-[#1e293b]">Health & Nutrition Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Goal Achievement</p>
                    <p className="text-sm text-[#94a3b8]">No data available</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-3">Top Dietary Preferences</p>
                    {(health?.dietary_preference_distribution ?? []).slice(0, 4).map((pref) => {
                      const total = (health?.dietary_preference_distribution ?? []).reduce((s, d) => s + d.customer_count, 0) || 1
                      const pct = Math.round((pref.customer_count / total) * 100)
                      return (
                        <div key={pref.name} className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-[#1e293b] w-28 truncate shrink-0">{pref.name}</span>
                          <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className="h-full bg-[#00438f] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#1e293b] w-8 text-right shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                    {(health?.dietary_preference_distribution?.length ?? 0) === 0 && (
                      <p className="text-sm text-[#94a3b8]">No preference data</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Trending Meal Plans</p>
                    <p className="text-sm text-[#94a3b8]">No data available</p>
                  </div>
                </CardContent>
              </Card>

              {/* RIGHT — Shopping & Revenue Impact */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-[#1e293b]">Shopping & Revenue Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">List Completion Rate</p>
                      <p className="text-2xl font-bold text-[#94a3b8] mt-1">—</p>
                      <p className="text-xs text-[#94a3b8]">No data available</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Completed Syncs</p>
                      <p className="text-2xl font-bold text-[#1e293b] mt-1">{overview?.totals.completedJobs.toLocaleString() ?? "—"}</p>
                      <p className="text-xs text-[#64748b]">Total ingestion jobs</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Avg. Basket Size</p>
                      <p className="text-2xl font-bold text-[#94a3b8] mt-1">—</p>
                      <p className="text-xs text-[#94a3b8]">No data available</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Product Category Insights</p>
                    <p className="text-sm text-[#94a3b8]">No usage data available</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROI Banner */}
            <div className="rounded-xl bg-[#00438f] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[1.4px] text-white/70 mb-4">Projected Annual ROI & Cost Savings</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(["Budget Adherence", "Food Waste Reduction", "Health Cost Savings"] as const).map((label) => (
                  <div key={label}>
                    <p className="text-3xl font-bold text-white/40">—</p>
                    <p className="text-xs text-white/60 mt-1">{label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">No data available</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-[#1e293b]">Category Distribution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 pb-2 border-b border-[#e2e8f0]">
                  {["Category Name", "Current Usage", "Trend (30D)", "Satisfaction"].map((h, i) => (
                    <span key={h} className={`text-[10px] font-semibold uppercase tracking-[0.5px] text-[#94a3b8] ${i > 0 ? "text-right" : ""}`}>{h}</span>
                  ))}
                </div>
                <div className="flex items-center justify-center h-32 text-sm text-[#94a3b8]">
                  No category usage data yet.
                </div>
              </CardContent>
            </Card>

          </TabsContent>

        </Tabs>
      </div>
    </AppShell>
  )
}

function DashKpiCard({
  label, value, unit, trend, trendUp,
}: {
  label: string; value: number | null; unit?: string; trend?: string; trendUp?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">{label}</p>
        {value !== null ? (
          <p className="text-2xl font-bold text-[#1e293b] mt-1">
            {value.toLocaleString()}{unit}
          </p>
        ) : (
          <p className="text-2xl font-bold text-[#94a3b8] mt-1">—</p>
        )}
        {trend && value !== null ? (
          <div className="flex items-center gap-1 mt-1">
            {trendUp
              ? <ArrowUpRight className="h-3.5 w-3.5 text-[#10b981]" />
              : <ArrowDownRight className="h-3.5 w-3.5 text-[#ef4444]" />}
            <span className={`text-xs font-medium ${trendUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>{trend}</span>
          </div>
        ) : value === null ? (
          <p className="text-xs text-[#94a3b8] mt-1">No data available</p>
        ) : null}
      </CardContent>
    </Card>
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
  const lower = (run.sourceName ?? run.flowName).toLowerCase()
  const isProduct = lower.includes("product")
  const isCustomer = lower.includes("customer")
  const count = run.totalRecordsWritten
  if (isProduct) return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count} P</span>
  if (isCustomer) return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count} C</span>
  return <span className="text-[12px] font-semibold text-[#1e293b] text-right">+{count}</span>
}
