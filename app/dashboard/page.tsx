"use client";

import * as React from "react";
import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/backend";
import { useBrandingConfig } from "@/hooks/useBrandingConfig";
import {
  Package,
  Users,
  BarChart3,
  Clock,
  Upload,
  PlusSquare,
  UserPlus,
  Search,
  CheckCircle,
  TrendingUp,
  Info,
  MoreHorizontal,
} from "lucide-react";

type Metrics = {
  totalProducts?: number;
  activeCustomers?: number;
  profilesWithMatchesPct?: number;
  pendingJobs?: number;
  unreadAlerts?: number;
};

type ListResponse<T> = { data?: T[] } | T[];

function toArray<T>(maybe: ListResponse<T>): T[] {
  if (Array.isArray(maybe)) return maybe;
  if (maybe && typeof maybe === "object" && "data" in maybe) {
    const d = (maybe as { data?: T[] }).data;
    return Array.isArray(d) ? d : [];
  }
  return [];
}

const QUICK_ACTIONS = [
  { title: "Import Data (CSV/API)", description: "Bulk sync products", href: "/onboarding", icon: Upload },
  { title: "Add New Product", description: "Manual entry mode", href: "/products?add=1", icon: PlusSquare },
  { title: "Add Customer Profile", description: "Create new member record", href: "/customers", icon: UserPlus },
  { title: "Run Match Analysis", description: "Execute background processing", href: "/search", icon: Search },
];


function getStatDelta(
  label: string,
  metrics: Metrics
): { text: string; isPositive: boolean } | undefined {
  switch (label) {
    case "Total Products":
      return metrics.totalProducts != null && metrics.totalProducts > 0
        ? { text: "+12% from last month", isPositive: true }
        : undefined;
    case "Active Customers":
      return metrics.activeCustomers != null
        ? { text: "+5 today", isPositive: true }
        : undefined;
    case "Profiles with Matches":
      return metrics.profilesWithMatchesPct != null && metrics.profilesWithMatchesPct > 0
        ? undefined
        : { text: "No active matches", isPositive: false };
    case "Pending Jobs":
      return metrics.pendingJobs != null && metrics.pendingJobs === 0
        ? { text: "All tasks complete", isPositive: false }
        : undefined;
    default:
      return undefined;
  }
}

export default function DashboardPage() {
  const { vendorName } = useBrandingConfig();
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<Metrics>({
    totalProducts: 0,
    activeCustomers: 0,
    profilesWithMatchesPct: 0,
    pendingJobs: 0,
    unreadAlerts: 0,
  });

  React.useEffect(() => {
    const ac = new AbortController();
    let mounted = true;
    const safeSet = (fn: () => void) => {
      if (mounted && !ac.signal.aborted) fn();
    };

    const load = async (attempt = 0) => {
      try {
        const r = await apiFetch("/metrics", { signal: ac.signal });
        if (ac.signal.aborted) return;

        if (r.ok) {
          const m = await r.json();
          if (ac.signal.aborted) return;
          safeSet(() =>
            setMetrics((prev) => ({
              ...prev,
              totalProducts: m.totalProducts ?? m.products ?? m.counts?.products ?? 0,
              activeCustomers:
                m.activeCustomers ?? m.customersActive ?? m.counts?.customersActive ?? m.customers ?? 0,
              profilesWithMatchesPct:
                m.profilesWithMatchesPct ?? m.matchRate ?? m.profiles_with_matches_pct ?? 0,
              pendingJobs: m.pendingJobs ?? m.jobs?.pending ?? m.counts?.jobsPending ?? 0,
            }))
          );

          const aRes = await apiFetch("/api/alerts/summary", { signal: ac.signal }).catch(() => null);
          if (ac.signal.aborted) return;
          if (aRes?.ok) {
            const alertsData = await aRes.json();
            safeSet(() => setMetrics((prev) => ({ ...prev, unreadAlerts: alertsData.unread ?? 0 })));
          }
          return;
        }

        if ((r.status === 401 || r.status === 403) && attempt < 1) {
          setTimeout(() => {
            if (!ac.signal.aborted) load(attempt + 1);
          }, 350);
          return;
        }

        const [pRes, cRes] = await Promise.all([
          apiFetch("/products", { signal: ac.signal }),
          apiFetch("/customers", { signal: ac.signal }),
        ]);
        if (ac.signal.aborted) return;

        const products = pRes.ok ? toArray(await pRes.json()) : [];
        const customers = cRes.ok ? toArray(await cRes.json()) : [];
        const activeCustomers = customers.filter((c: { status?: string }) => {
          const s = ((c?.status ?? "") as string).toLowerCase();
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
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
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

  const statCards = [
    { label: "Total Products", value: metrics.totalProducts ?? 0, href: "/products", icon: Package },
    { label: "Active Customers", value: metrics.activeCustomers ?? 0, href: "/customers", icon: Users },
    {
      label: "Profiles with Matches",
      value: metrics.profilesWithMatchesPct != null ? `${Math.round(metrics.profilesWithMatchesPct)}%` : "—",
      href: "/customers",
      icon: BarChart3,
    },
    { label: "Pending Jobs", value: metrics.pendingJobs ?? 0, href: "/jobs", icon: Clock },
  ];

  const RECENT_ACTIVITIES = [
    { icon: CheckCircle, text: "Product import completed", desc: "1,010 items verified and indexed successfully.", time: "2 hours ago", isSuccess: true },
    { icon: UserPlus, text: "New customers added", desc: "Batch of 5 new customer profiles synchronized.", time: "5 hours ago", isSuccess: false },
  ];

  if (loading) {
    return (
      <AppShell>
        <div className="-mx-4 md:-mx-6 -my-4 bg-[#f5f7f8] min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-[1280px] mx-auto p-8 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-96" />
            </div>
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="h-[160px] p-[25px] rounded-[12px] border-[#e2e8f0]">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-9 w-20" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-4 md:-mx-6 -my-4 bg-[#f5f7f8] min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-[1280px] mx-auto p-8 flex flex-col gap-8">
          {/* Title & Subtitle */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold tracking-[-0.6px] text-[#0f172a] leading-8">
              Dashboard Overview
            </h1>
            <p className="text-base leading-6 text-[#64748b]">
              Welcome back. Here is what&apos;s happening across your {vendorName} enterprise.
            </p>
          </div>

          {/* 4 Metric cards - equal flex/grid, Figma specs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map(({ label, value, href, icon: Icon }) => {
              const delta = getStatDelta(label, metrics);
              const content = (
                <Card className="h-[160px] p-[25px] rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748b]">
                      {label}
                    </p>
                    <Icon className="h-8 w-8 text-[#64748b] shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[30px] font-bold leading-9 text-[#0f172a]">{value}</p>
                    {delta && (
                      <div className="flex items-center gap-1 pt-1">
                        {delta.isPositive ? (
                          <TrendingUp className="h-3 w-3 shrink-0 text-[#16a34a]" />
                        ) : label === "Pending Jobs" && delta.text === "All tasks complete" ? (
                          <CheckCircle className="h-3 w-3 shrink-0 text-[#94a3b8]" />
                        ) : (
                          <Info className="h-3 w-3 shrink-0 text-[#94a3b8]" />
                        )}
                        <p className={`text-[12px] font-medium ${delta.isPositive ? "text-[#16a34a]" : "text-[#94a3b8]"}`}>
                          {delta.text}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
              return href ? (
                <a key={label} href={href}>
                  {content}
                </a>
              ) : (
                <div key={label}>
                  {content}
                </div>
              );
            })}
          </div>

          {/* Lower section: two-column layout - left: Quick Actions + Mini Banner, right: Recent Activity */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column: Quick Actions card + Mini Banner */}
            <div className="flex flex-col gap-6 lg:flex-[5] lg:min-w-0">
              {/* Quick Actions card */}
              <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pt-6 pb-[25px] px-6">
                  <h2 className="text-[18px] font-bold text-[#0f172a] leading-7">Quick Actions</h2>
                  <p className="text-[14px] text-[#64748b]">Manage data and operations</p>
                </div>
                <div className="grid grid-cols-2 gap-4 p-6">
                  {QUICK_ACTIONS.map(({ title, description, href, icon: Icon }) => (
                    <a key={title} href={href} className="flex items-center gap-4 border border-[#e2e8f0] rounded-[12px] pl-[17px] py-[17px] pr-4 hover:shadow-md transition-shadow">
                      <div className="rounded-lg bg-[rgba(0,67,143,0.1)] w-12 h-12 shrink-0 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[#00438f]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[14px] text-[#0f172a]">{title}</h3>
                        <p className="text-[12px] text-[#64748b] mt-0.5 truncate">{description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>

              {/* Mini Banner */}
              <div
                className="rounded-[12px] p-6 text-white overflow-hidden"
                style={{ background: "linear-gradient(100.116deg, rgb(0, 105, 170) 2.2877%, rgb(0, 75, 141) 121.29%)" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[18px] font-bold leading-7">Scale your operations</h3>
                    <p className="text-[14px] text-white/90 mt-1 max-w-[384px]">
                      Connect your API keys to automate the data ingestion process across all club branches.
                    </p>
                  </div>
                  <a
                    href="/onboarding"
                    className="shrink-0 inline-flex items-center justify-center bg-white text-[#00438f] font-bold text-[14px] px-4 py-2 rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-white/90"
                  >
                    Setup API
                  </a>
                </div>
              </div>
            </div>

            {/* Right column: Recent Activity card */}
            <div className="w-full lg:flex-[3] lg:min-w-[280px]">
              <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
                <div className="border-b border-[#e2e8f0] pt-6 pb-[25px] px-6">
                  <h3 className="text-[18px] font-bold text-[#0f172a] leading-7">Recent Activity</h3>
                </div>
                <div className="flex-1 flex flex-col p-6 gap-6">
                  <div className="flex flex-col gap-6">
                    {RECENT_ACTIVITIES.map(({ icon: Icon, text, desc, time, isSuccess }, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="relative flex flex-col items-center shrink-0">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${isSuccess ? "bg-[#dcfce7]" : "bg-[rgba(0,67,143,0.1)]"}`}>
                            <Icon className={`h-4 w-4 ${isSuccess ? "text-[#16a34a]" : "text-[#00438f]"}`} />
                          </div>
                          {i < RECENT_ACTIVITIES.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-[calc(100%+24px)] bg-[#f1f5f9]" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#0f172a]">{text}</p>
                          <p className="text-[12px] text-[#64748b] leading-4">{desc}</p>
                          <p className="text-[10px] uppercase text-[#94a3b8]">{time}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-4 items-start">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-[#f1f5f9]">
                        <MoreHorizontal className="h-3 w-3 text-[#94a3b8]" />
                      </div>
                      <div className="flex flex-col gap-2 pt-1">
                        <p className="text-[14px] font-medium text-[#94a3b8]">And more activities...</p>
                        <a href="/audit" className="text-[12px] font-bold text-[#00438f] hover:underline">
                          View Full Audit Log
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="border border-dashed border-[#e2e8f0] rounded-[8px] bg-[#f8fafc] px-4 py-4 text-center">
                    <p className="text-[12px] text-[#64748b]">
                      System status: <span className="font-bold text-[#16a34a]">Operational</span>.
                    </p>
                    <p className="text-[12px] text-[#64748b] mt-1">Last backup performed at 04:00 AM UTC.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
