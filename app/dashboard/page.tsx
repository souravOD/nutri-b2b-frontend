"use client";

import * as React from "react";
import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/backend";
import { cn } from "@/lib/utils";

type Metrics = {
  totalProducts?: number;
  activeCustomers?: number;
  profilesWithMatchesPct?: number;
  pendingJobs?: number;
};

type ListResponse<T> = { data?: T[] } | T[];

// normalize our list responses (sometimes [], sometimes { data: [] })
function toArray<T>(maybe: ListResponse<T>): T[] {
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
    const ac = new AbortController();
    let mounted = true;
    const safeSet = (fn: () => void) => {
      if (mounted && !ac.signal.aborted) fn();
    };

    const load = async (attempt = 0) => {
      try {
        // Prefer consolidated metrics endpoint
        const r = await apiFetch("/metrics", { signal: ac.signal });
        if (ac.signal.aborted) return;

        if (r.ok) {
          const m = await r.json();
          if (ac.signal.aborted) return;
          safeSet(() =>
            setMetrics({
              totalProducts: m.totalProducts ?? m.products ?? m.counts?.products ?? 0,
              activeCustomers:
                m.activeCustomers ?? m.customersActive ?? m.counts?.customersActive ?? m.customers ?? 0,
              profilesWithMatchesPct:
                m.profilesWithMatchesPct ?? m.matchRate ?? m.profiles_with_matches_pct ?? 0,
              pendingJobs: m.pendingJobs ?? m.jobs?.pending ?? m.counts?.jobsPending ?? 0,
            })
          );
          return;
        }

        // first-paint race: retry once on 401/403
        if ((r.status === 401 || r.status === 403) && attempt < 1) {
          setTimeout(() => {
            if (!ac.signal.aborted) load(attempt + 1);
          }, 350);
          return;
        }

        // Fallback: derive from lists
        const [pRes, cRes] = await Promise.all([
          apiFetch("/products", { signal: ac.signal }),
          apiFetch("/customers", { signal: ac.signal }),
        ]);
        if (ac.signal.aborted) return;

        const products = pRes.ok ? toArray(await pRes.json()) : [];
        const customers = cRes.ok ? toArray(await cRes.json()) : [];

        const activeCustomers = customers.filter((c: any) => {
          const s = (c?.status ?? "").toString().toLowerCase();
          return !s || s === "active";
        }).length;

        safeSet(() =>
          setMetrics({
            totalProducts: products.length,
            activeCustomers,
            profilesWithMatchesPct: 0,
            pendingJobs: 0,
          })
        );
      } catch (err: any) {
        // Ignore aborts from StrictMode/unmount
        if (err?.name === "AbortError") return;
        // Optional: console.error("dashboard load failed", err);
      } finally {
        safeSet(() => setLoading(false));
      }
    };

    load();
    return () => {
      mounted = false;
      ac.abort();
    };
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
    <AppShell title="Odyssey B2B">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={metrics.totalProducts ?? 0} sub="View All" href="/products" />
        <StatCard label="Active Customers" value={metrics.activeCustomers ?? 0} sub="Manage" href="/customers" />
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
        <StatCard label="Pending Jobs" value={metrics.pendingJobs ?? 0} sub="View Jobs" href="/jobs" />
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
