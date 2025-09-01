"use client";

import * as React from "react";
import Image from "next/image";
import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/backend";
import { cn } from "@/lib/utils";

type Metrics = {
  totalProducts?: number;
  activeCustomers?: number;
  profilesWithMatchesPct?: number; // optional
  pendingJobs?: number;            // optional
};

type ListResponse<T> = { data?: T[] } | T[]; // our APIs sometimes return {data: []}, sometimes [].

function pickArray<T = unknown>(maybe: ListResponse<T>): T[] {
  if (Array.isArray(maybe)) return maybe;
  if (maybe && typeof maybe === "object" && "data" in maybe) {
    const d = (maybe as any).data;
    return Array.isArray(d) ? d : [];
  }
  return [];
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<Metrics>({
    totalProducts: 0,
    activeCustomers: 0,
    profilesWithMatchesPct: 0,
    pendingJobs: 0,
  });

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1) Try metrics first (if backend supports it)
        let usedFallback = false;
        try {
          const mRes = await apiFetch("/metrics");
          if (mRes.ok) {
            const m = await mRes.json();
            // Normalize a few common shapes
            const normalized: Metrics = {
              totalProducts:
                m.totalProducts ?? m.products ?? m.counts?.products ?? 0,
              activeCustomers:
                m.activeCustomers ??
                m.customersActive ??
                m.counts?.customersActive ??
                m.customers ??
                0,
              profilesWithMatchesPct:
                m.profilesWithMatchesPct ??
                m.matchRate ??
                m.profiles_with_matches_pct ??
                0,
              pendingJobs:
                m.pendingJobs ?? m.jobs?.pending ?? m.counts?.jobsPending ?? 0,
            };

            // If both key counts are clearly 0, we’ll still do a fallback pass.
            if (
              (normalized.totalProducts ?? 0) === 0 &&
              (normalized.activeCustomers ?? 0) === 0
            ) {
              usedFallback = true;
            } else {
              setMetrics((prev) => ({ ...prev, ...normalized }));
            }
          } else {
            usedFallback = true;
          }
        } catch {
          usedFallback = true;
        }

        // 2) Fallback: count straight from lists (products/customers)
        if (usedFallback) {
          const [pRes, cRes] = await Promise.all([
            apiFetch("/products"),
            apiFetch("/customers"),
          ]);
          const products = pRes.ok ? pickArray(await pRes.json()) : [];
          const customers = cRes.ok ? pickArray(await cRes.json()) : [];

          // If your API marks an "active" flag on the customer rows, filter here.
          // Otherwise, we’ll treat all fetched customers as active.
          const activeCustomers = customers.filter((c: any) =>
            typeof c?.status === "string"
              ? c.status === "active"
              : true
          ).length;

          setMetrics({
            totalProducts: products.length,
            activeCustomers,
            profilesWithMatchesPct: 0, // you can wire this to a matches endpoint later
            pendingJobs: 0,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-10 w-16" />
            </Card>
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Odyssey Nutrition">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={metrics.totalProducts ?? 0}
          sub="View All"
          href="/products"
        />

        <StatCard
          label="Active Customers"
          value={metrics.activeCustomers ?? 0}
          sub="Manage"
          href="/customers"
        />

        <StatCard
          label="Profiles with Matches"
          value={
            metrics.profilesWithMatchesPct !== undefined
              ? `${Math.round(metrics.profilesWithMatchesPct)}%`
              : "—"
          }
          sub="View Analysis"
          href="/search?tab=profiles"
        />

        <StatCard
          label="Pending Jobs"
          value={metrics.pendingJobs ?? 0}
          sub="View Jobs"
          href="/jobs"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild variant="default">
              <a href="/ingest">Import Data (CSV/API)</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/products/new">Add New Product</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/customers/new">Add Customer Profile</a>
            </Button>
            <Button asChild variant="secondary">
              <a href="/search">Run Match Analysis</a>
            </Button>
          </div>
        </Card>

        {/* You can keep your existing Recent Activity / other panels here */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <div className="text-sm text-muted-foreground">
            Product import completed, new customers added, and more…
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <Card className={cn("p-4 hover:shadow-sm transition-shadow cursor-pointer")}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub ? <div className="mt-2 text-xs text-primary">{sub}</div> : null}
    </Card>
  );
  return href ? <a href={href}>{content}</a> : content;
}
