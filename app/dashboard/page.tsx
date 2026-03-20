"use client";

import * as React from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/backend";
import { useBrandingConfig } from "@/hooks/useBrandingConfig";
import {
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  ShoppingCart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type OverviewTotals = {
  products: number;
  customers: number;
  completedJobs: number;
};

type DietaryPref = { name: string; customer_count: number };

type IngestRun = {
  status: string;
  totalRecordsWritten?: number;
  total_records_written?: number;
};

type ProductItem = { category?: string; tags?: string[]; custom_tags?: string[] };

type DashboardData = {
  totals: OverviewTotals;
  dietary: DietaryPref[];
  totalCustomers: number;
  integrationUsage: number;
  categoryDistribution: { name: string; count: number; trend: number | null }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as T[];
    if (Array.isArray(r.items)) return r.items as T[];
  }
  return [];
}

function groupByCategory(products: ProductItem[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const p of products) {
    const cat = p.category ?? "Other";
    map[cat] = (map[cat] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number | null;
  trendLabel?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#64748b]">{label}</p>
            <p className="text-[28px] font-bold text-[#0f172a] mt-1 leading-9">{value}</p>
            {trend !== undefined && trend !== null ? (
              <div className="flex items-center gap-1 mt-1">
                {trend >= 0
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-[#10b981]" />
                  : <ArrowDownRight className="h-3.5 w-3.5 text-[#ef4444]" />}
                <span className={`text-xs font-medium ${trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                  {trend >= 0 ? "+" : ""}{trend}% {trendLabel ?? "vs last period"}
                </span>
              </div>
            ) : trendLabel ? (
              <p className="text-xs text-[#94a3b8] mt-1">{trendLabel}</p>
            ) : null}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-[#1e293b]">{label}</span>
        <span className="text-[#64748b]">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
        <div className="h-full bg-[#00438f] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < n ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#e2e8f0] fill-[#e2e8f0]"}`}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { vendorName } = useBrandingConfig();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DashboardData>({
    totals: { products: 0, customers: 0, completedJobs: 0 },
    dietary: [],
    totalCustomers: 0,
    integrationUsage: 0,
    categoryDistribution: [],
  });

  React.useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [overviewRes, healthRes, runsRes, productsRes] = await Promise.allSettled([
          apiFetch("/api/v1/analytics/overview?days=30"),
          apiFetch("/api/v1/analytics/health-summary"),
          apiFetch("/api/v1/ingest/runs?limit=50"),
          apiFetch("/products"),
        ]);

        if (!alive) return;

        // Overview totals
        let totals: OverviewTotals = { products: 0, customers: 0, completedJobs: 0 };
        if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
          const j = await overviewRes.value.json().catch(() => ({}));
          totals = {
            products: j.totals?.products ?? 0,
            customers: j.totals?.customers ?? 0,
            completedJobs: j.totals?.completedJobs ?? 0,
          };
        }

        // Dietary preferences
        let dietary: DietaryPref[] = [];
        let totalCustomers = totals.customers;
        if (healthRes.status === "fulfilled" && healthRes.value.ok) {
          const j = await healthRes.value.json().catch(() => ({}));
          dietary = (j.dietary_preference_distribution ?? []).slice(0, 5);
          totalCustomers = j.total_customers ?? totals.customers;
        }

        // Integration usage — sum of completed run records
        let integrationUsage = 0;
        if (runsRes.status === "fulfilled" && runsRes.value.ok) {
          const j = await runsRes.value.json().catch(() => ({}));
          const runs: IngestRun[] = toArray(j);
          integrationUsage = runs
            .filter((r) => r.status === "completed")
            .reduce((s, r) => s + (r.totalRecordsWritten ?? r.total_records_written ?? 0), 0);
        }

        // Category distribution from products
        let categoryDistribution: DashboardData["categoryDistribution"] = [];
        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const j = await productsRes.value.json().catch(() => ({}));
          const products: ProductItem[] = toArray(j);
          categoryDistribution = groupByCategory(products).map((c) => ({
            ...c,
            trend: null,
          }));
        }

        if (alive) {
          setData({ totals, dietary, totalCustomers, integrationUsage, categoryDistribution });
        }
      } catch {
        /* non-critical — page shows with zeros */
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  const maxDietary = data.dietary[0]?.customer_count ?? 1;
  const maxCategory = data.categoryDistribution[0]?.count ?? 1;

  if (loading) {
    return (
      <AppShell>
        <div className="-mx-4 md:-mx-6 -my-4 bg-[#f8fafc] min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-[12px]" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Skeleton className="h-80 rounded-[12px]" />
              <Skeleton className="h-80 rounded-[12px]" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-4 md:-mx-6 -my-4 bg-[#f8fafc] min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-8">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px]">
                Analytics Dashboard
              </h1>
              <p className="text-[15px] text-[#64748b] mt-1">
                Monitor engagement, health insights, and revenue impact for {vendorName}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#64748b] border border-[#e2e8f0] rounded-full px-3 py-1 bg-white">
              Last 30 Days
            </span>
          </div>

          {/* ── Section 1: Engagement Overview ────────────────────────────── */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#94a3b8] mb-3">
              Engagement Overview
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                label="Total Members"
                value={data.totals.customers.toLocaleString()}
                icon={Users}
                trend={null}
                trendLabel="All time"
                iconBg="bg-[rgba(0,67,143,0.1)]"
                iconColor="text-[#00438f]"
              />
              <KpiCard
                label="DAU / MAU Ratio"
                value="—"
                icon={Activity}
                trendLabel="Not yet tracked"
                iconBg="bg-[#f1f5f9]"
                iconColor="text-[#64748b]"
              />
              <KpiCard
                label="Retention Rate"
                value={data.totalCustomers > 0 ? `${Math.round((data.totals.customers / Math.max(data.totalCustomers, 1)) * 100)}%` : "—"}
                icon={TrendingUp}
                trendLabel="Active / total"
                iconBg="bg-[#dcfce7]"
                iconColor="text-[#059669]"
              />
              <KpiCard
                label="NPS Score"
                value="—"
                icon={Star}
                trendLabel="Not yet tracked"
                iconBg="bg-[#fef3c7]"
                iconColor="text-[#d97706]"
              />
            </div>
          </section>

          {/* ── Section 2: Health + Shopping (2-col) ──────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: Health & Nutrition Insights */}
            <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#f1f5f9]">
                <Heart className="h-4 w-4 text-[#ef4444]" />
                <p className="text-[13px] font-bold text-[#0f172a]">Health &amp; Nutrition Insights</p>
              </div>
              <CardContent className="px-5 py-4 space-y-5">

                {/* Goal Achievement */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">
                    Goal Achievement
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: "Protein Targets", pct: null },
                      { label: "Calorie Deficit", pct: null },
                      { label: "Micronutrients", pct: null },
                    ].map(({ label, pct }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[#1e293b]">{label}</span>
                          <span className="text-[#94a3b8]">—</span>
                        </div>
                        <div className="h-2 w-full bg-[#f1f5f9] rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Dietary Preferences */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">
                    Top Dietary Preferences
                  </p>
                  {data.dietary.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {data.dietary.map((d) => (
                        <BarRow key={d.name} label={d.name} count={d.customer_count} max={maxDietary} />
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/analytics"
                  className="flex items-center gap-1 text-[12px] font-bold text-[#00438f] hover:underline"
                >
                  View Health Summary <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Right: Shopping & Revenue Impact */}
            <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#f1f5f9]">
                <ShoppingCart className="h-4 w-4 text-[#00438f]" />
                <p className="text-[13px] font-bold text-[#0f172a]">Shopping &amp; Revenue Impact</p>
              </div>
              <CardContent className="px-5 py-4 space-y-5">

                {/* 2×2 stat mini-grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "List Completion Rate", value: "—", sub: "Not yet tracked" },
                    {
                      label: "Integration Usage",
                      value: data.integrationUsage > 0 ? data.integrationUsage.toLocaleString() : "—",
                      sub: "Scanned items",
                    },
                    { label: "Avg. Basket Size", value: "—", sub: "Not yet tracked" },
                    {
                      label: "Total Products",
                      value: data.totals.products.toLocaleString(),
                      sub: "In catalog",
                    },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-[#f8fafc] rounded-[8px] p-3 border border-[#f1f5f9]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#94a3b8]">{label}</p>
                      <p className="text-[20px] font-bold text-[#0f172a] mt-1">{value}</p>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Product Category Insights */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">
                    Product Category Insights
                  </p>
                  {data.categoryDistribution.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No product data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {data.categoryDistribution.slice(0, 4).map((c) => (
                        <BarRow key={c.name} label={c.name} count={c.count} max={maxCategory} />
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/products"
                  className="flex items-center gap-1 text-[12px] font-bold text-[#00438f] hover:underline"
                >
                  View All Products <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* ── Section 3: Projected Annual ROI Banner ─────────────────────── */}
          <section
            className="rounded-[12px] p-6 text-white"
            style={{ background: "linear-gradient(110deg, #00438f 0%, #003070 100%)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/60 mb-5">
              Projected Annual ROI &amp; Cost Savings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  label: "Budget Adherence",
                  value: "—",
                  desc: "Member spend vs. planned nutrition budget",
                },
                {
                  label: "Food Waste Reduction",
                  value: "—",
                  desc: "Estimated reduction in wasted food purchases",
                },
                {
                  label: "Health Cost Savings",
                  value: "—",
                  desc: "Projected healthcare cost reduction",
                },
              ].map(({ label, value, desc }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-white/60">{label}</p>
                  <p className="text-[32px] font-bold text-white mt-1">{value}</p>
                  <p className="text-[12px] text-white/70 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 4: Category Distribution Summary ───────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#94a3b8]">
                Category Distribution Summary
              </p>
              <Link href="/products" className="text-[12px] font-bold text-[#00438f] hover:underline flex items-center gap-1">
                View All Details <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                      {["Category Name", "Current Usage", "Trend (30D)", "Satisfaction", "Actions"].map((h, i) => (
                        <th
                          key={h}
                          className={`py-3 px-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.5px] whitespace-nowrap ${i > 0 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryDistribution.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#94a3b8] text-sm">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-[#e2e8f0]" />
                          No product categories yet
                        </td>
                      </tr>
                    ) : (
                      data.categoryDistribution.map((c) => (
                        <tr key={c.name} className="border-b border-[#f1f5f9] last:border-0 hover:bg-[#f8fafc] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#0f172a]">{c.name}</td>
                          <td className="py-3 px-4 text-right text-[#475569]">{c.count.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            {c.trend !== null ? (
                              <span className={`flex items-center justify-end gap-1 font-medium ${c.trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                                {c.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {c.trend >= 0 ? "+" : ""}{c.trend}%
                              </span>
                            ) : (
                              <span className="text-[#94a3b8]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end">
                              <StarRating n={c.count > 10 ? 5 : c.count > 5 ? 4 : c.count > 2 ? 3 : 2} />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/products?category=${encodeURIComponent(c.name)}`}
                              className="text-[11px] font-bold text-[#00438f] hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {data.categoryDistribution.length > 0 && (
                <div className="border-t border-[#f1f5f9] px-4 py-2.5 bg-[#f8fafc]/60">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#94a3b8]">
                    Data last updated from product catalog
                  </p>
                </div>
              )}
            </Card>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
