"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import MetricCard from "@/components/metric-card"
import ActivityFeed, { type ActivityItem } from "@/components/activity-feed"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true)
  const [metrics, setMetrics] = React.useState({
    products: 0,
    customers: 0,
    matchesPct: 72,
    jobs: 0,
    trendProducts: 8,
    trendCustomers: 4,
  })
  const [activity, setActivity] = React.useState<ActivityItem[]>([])
  const { toast } = useToast()

  React.useEffect(() => {
    const load = async () => {
      const [prodRes, custRes, jobsRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/jobs").then((r) => r.json()),
      ])
      setMetrics((m) => ({
        ...m,
        products: prodRes.items?.length ?? 0,
        customers: custRes.items?.length ?? 0,
        jobs: jobsRes.items?.filter((j: any) => j.status === "processing" || j.status === "queued").length ?? 0,
      }))
      setActivity([
        {
          id: "a1",
          type: "success",
          title: "Product import completed",
          timestamp: new Date().toISOString(),
          details: "284 products imported",
        },
        {
          id: "a2",
          type: "warning",
          title: "2 products missing categories",
          timestamp: new Date(Date.now() - 3600_000).toISOString(),
          details: "Assign categories to improve matching",
        },
        {
          id: "a3",
          type: "info",
          title: "New matches available for John Doe",
          timestamp: new Date(Date.now() - 7200_000).toISOString(),
        },
      ])
      setTimeout(() => setLoading(false), 600)
    }
    load()
  }, [])

  return (
    <AppShell title="Odyssey Nutrition">
      <section className="grid gap-4">
        <WelcomeBanner
          vendorName="Acme Foods"
          lastLogin="2025-08-07 10:22"
          onHelp={() => toast({ title: "Help", description: "Contact support@odyssey" })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Products"
            value={loading ? "—" : metrics.products}
            trend={metrics.trendProducts}
            linkLabel="View All"
            href="/products"
          />
          <MetricCard
            title="Active Customers"
            value={loading ? "—" : metrics.customers}
            trend={metrics.trendCustomers}
            linkLabel="Manage"
            href="/customers/1"
          />
          <MetricCard
            title="Profiles with Matches"
            value={`${metrics.matchesPct}%`}
            progress={metrics.matchesPct}
            linkLabel="View Analysis"
            href="/customers/1"
          />
          <MetricCard
            title="Pending Jobs"
            value={loading ? "—" : metrics.jobs}
            trend={-2}
            linkLabel="View Jobs"
            href="/jobs"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <ActivityFeed items={activity} collapsible />
          </div>
          <div className="space-y-3">
            <QuickActions />
          </div>
        </div>
      </section>
    </AppShell>
  )
}

function WelcomeBanner({
  vendorName = "Vendor",
  lastLogin = "",
  onHelp = () => {},
}: {
  vendorName?: string
  lastLogin?: string
  onHelp?: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-3 py-4">
        <div className="flex-1">
          <div className="text-lg font-semibold">{`Welcome back, ${vendorName}`}</div>
          <div className="text-sm text-muted-foreground">
            {"Last login: "}
            {lastLogin}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/products">{"Add New Product"}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/customers/1">{"Add Customer Profile"}</Link>
          </Button>
          <Button asChild>
            <Link href="/jobs">{"Run Match Analysis"}</Link>
          </Button>
          <Button variant="outline" onClick={onHelp}>
            {"Help/Support"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActions() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-sm font-medium mb-3">{"Quick Actions"}</div>
        <div className="grid gap-2">
          <Button asChild className="justify-start">
            <Link href="/jobs">{"Import Data (CSV/API)"}</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start bg-transparent">
            <Link href="/products">{"Add New Product"}</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start bg-transparent">
            <Link href="/customers/1">{"Add Customer Profile"}</Link>
          </Button>
          <Button asChild variant="secondary" className="justify-start">
            <Link href="/customers/1">{"Run Match Analysis"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
