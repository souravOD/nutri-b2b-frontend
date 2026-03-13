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
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { getAnalyticsOverview, getHealthSummary, type AnalyticsOverview, type HealthSummary } from "@/lib/api-analytics"
import { Package, Users, CheckCircle, BarChart3 } from "lucide-react"

const DAY_OPTIONS = [7, 30, 90] as const

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[#64748b]">{label}</p>
            <p className="text-2xl font-semibold text-[#1e293b] mt-1">{value.toLocaleString()}</p>
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
  customers: { label: "Customers", color: "#0ea5e9" },
  runs: { label: "Runs", color: "#8b5cf6" },
}

const healthConfig = {
  customer_count: { label: "Customers", color: "#00438f" },
}

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<7 | 30 | 90>(30)
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(null)
  const [health, setHealth] = React.useState<HealthSummary | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getAnalyticsOverview(days), getHealthSummary()])
      .then(([ov, hs]) => {
        setOverview(ov)
        setHealth(hs)
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
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Day selector */}
            <div className="flex gap-2">
              {DAY_OPTIONS.map((d) => (
                <Button
                  key={d}
                  variant={days === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(d)}
                  className={days === d ? "bg-[#00438f] text-white" : ""}
                >
                  {d}d
                </Button>
              ))}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Products" value={overview?.totals.products ?? 0} icon={Package} />
              <StatCard label="Active Customers" value={overview?.totals.customers ?? 0} icon={Users} />
              <StatCard label="Completed Jobs" value={overview?.totals.completedJobs ?? 0} icon={CheckCircle} />
            </div>

            {/* Products & Customers trend chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Products & Customers Added</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-48 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>
                ) : isEmpty || trendData.length === 0 ? (
                  <EmptyChart message="No data yet — run an ingestion to populate this chart." />
                ) : (
                  <ChartContainer config={trendConfig} className="h-48 w-full">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="products" stroke="#00438f" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="customers" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Ingestion runs trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Ingestion Runs</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-48 flex items-center justify-center text-[#94a3b8] text-sm">Loading…</div>
                ) : runData.length === 0 ? (
                  <EmptyChart message="No ingestion runs recorded yet." />
                ) : (
                  <ChartContainer config={{ runs: { label: "Runs", color: "#8b5cf6" } }} className="h-48 w-full">
                    <LineChart data={runData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="runs" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── HEALTH SUMMARY TAB ── */}
          <TabsContent value="health" className="space-y-6 mt-4">
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
                <HealthBarCard
                  title="Top Allergens"
                  data={health.allergen_distribution}
                  dataKey="customer_count"
                  nameKey="name"
                />
                <HealthBarCard
                  title="Top Health Conditions"
                  data={health.health_condition_distribution}
                  dataKey="customer_count"
                  nameKey="name"
                />
                <HealthBarCard
                  title="Dietary Preferences"
                  data={health.dietary_preference_distribution}
                  dataKey="customer_count"
                  nameKey="name"
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

function HealthBarCard({
  title,
  data,
  dataKey,
  nameKey,
}: {
  title: string
  data: { name: string; customer_count: number }[]
  dataKey: string
  nameKey: string
}) {
  const chartData = [...data].slice(0, 10).reverse()
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart message="No data available." />
        ) : (
          <ChartContainer config={{ customer_count: { label: "Customers", color: "#00438f" } }} className="w-full" style={{ height: Math.max(160, chartData.length * 32) }}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11 }} width={120} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} fill="#00438f" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
