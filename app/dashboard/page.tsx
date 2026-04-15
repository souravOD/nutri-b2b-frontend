"use client";

import * as React from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/backend";
import { useBrandingConfig } from "@/hooks/useBrandingConfig";
import {
  Users,
  Activity,
  TrendingUp,
  Star,
  ExternalLink,
  Heart,
  ShoppingCart,
  BarChart3,
  ArrowUpRight,
  Zap,
  X,
  Clock,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ChurnWidget, type ChurnData } from "@/components/ChurnWidget";

// ── Types ─────────────────────────────────────────────────────────────────────
type OverviewTotals = { products: number; customers: number; completedJobs: number };
type DietaryPref   = { name: string; customer_count: number };
type TrendingCat   = { id: string; code: string; label: string; description: string; product_count: number };
type PopularProduct = { id: string; name: string; dietaryTags?: string[] | null };
type IngestRun     = { status: string; totalRecordsWritten?: number; total_records_written?: number };

type GoalMetric = { metric: string; achieved_pct: number };
type RoiData = { budgetAdherence: string | null; foodWasteReduction: string | null; healthCostSavings: string | null };

type NpsBreakdown = { promoters: number; passives: number; detractors: number; total: number };

type DashboardData = {
  totals: OverviewTotals;
  dietary: DietaryPref[];
  totalCustomers: number;
  integrationUsage: number;
  trendingCats: TrendingCat[];
  popularProducts: PopularProduct[];
  activationRate: number | null;
  goalAchievement: GoalMetric[];
  roi: RoiData;
  npsScore: number | null;
  npsBreakdown: NpsBreakdown | null;
  churnData: ChurnData | null;
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

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, sub, trend, iconBg, iconColor,
}: {
  label: string; value: string | number; icon: React.ElementType;
  sub?: string; trend?: number | null; iconBg: string; iconColor: string;
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
                <ArrowUpRight className="h-3.5 w-3.5 text-[#10b981]" />
                <span className="text-xs font-medium text-[#10b981]">+{trend}% vs last period</span>
              </div>
            ) : sub ? (
              <p className="text-xs text-[#94a3b8] mt-1">{sub}</p>
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

function PctBar({ label, pctVal, color = "var(--primary)" }: { label: string; pctVal: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] font-medium text-[#1e293b]">{label}</span>
        <span className="text-[12px] font-semibold text-[#0f172a]">{pctVal}%</span>
      </div>
      <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, background: color }} />
      </div>
    </div>
  );
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#e2e8f0] fill-[#e2e8f0]"}`} />
      ))}
    </div>
  );
}

// ── Avg Session Duration Card (reads localStorage history + detail dialog) ────
type SessionRecord = { start: number; end: number; durationMs: number };

function AvgSessionCard() {
  const [stats, setStats] = React.useState<{ avgMs: number | null; lastMs: number | null; count: number }>({
    avgMs: null, lastMs: null, count: 0,
  });
  const [history, setHistory] = React.useState<SessionRecord[]>([]);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  React.useEffect(() => {
    import("@/hooks/useSessionTimeout")
      .then(({ getSessionStats, getSessionHistory }) => {
        const s = getSessionStats();
        const h = getSessionHistory() as SessionRecord[];
        setStats({ avgMs: s.avgMs, lastMs: s.lastMs, count: h.length });
        setHistory(h);
      })
      .catch(() => {});
  }, []);

  function fmt(ms: number | null): string {
    if (ms === null) return "—";
    if (ms < 60_000) return "<1m";
    return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  }

  function fmtDate(ts: number): string {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <>
      <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#64748b]">Avg Session</p>
              <p className="text-[28px] font-bold text-[#0f172a] mt-1 leading-9">{fmt(stats.avgMs)}</p>
              <p className="text-xs text-[#94a3b8] mt-1">
                {stats.count > 0 ? `Based on ${stats.count} session${stats.count === 1 ? "" : "s"}` : "No history yet"}
              </p>
              {stats.count > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="mt-1.5 text-[11px] text-[#0284c7] hover:underline font-medium"
                >
                  View history →
                </button>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f9ff]">
              <Clock className="h-5 w-5 text-[#0284c7]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session History (last {history.length})</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-[#94a3b8] py-4 text-center">No session history yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#f1f5f9] text-[#64748b]">
                    <th className="text-left py-2 px-3 font-semibold">#</th>
                    <th className="text-left py-2 px-3 font-semibold">Started</th>
                    <th className="text-right py-2 px-3 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((r, i) => (
                    <tr key={r.start} className="border-b border-[#f8fafc] hover:bg-[#f8fafc]">
                      <td className="py-2 px-3 text-[#94a3b8]">{history.length - i}</td>
                      <td className="py-2 px-3 text-[#334155]">{fmtDate(r.start)}</td>
                      <td className="py-2 px-3 text-right font-medium text-[#0284c7]">{fmt(r.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── NPS Card with Detractors toggle ──────────────────────────────────────────
function NpsCard({ npsScore, breakdown }: { npsScore: number | null; breakdown: NpsBreakdown | null }) {
  const [detractorsOnly, setDetractorsOnly] = React.useState(false)

  const scoreLabel = npsScore !== null ? (npsScore >= 0 ? `+${Math.round(npsScore)}` : String(Math.round(npsScore))) : "—"
  const detractorPct = breakdown ? Math.round((breakdown.detractors / breakdown.total) * 100) : null

  return (
    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#64748b]">NPS Score</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#64748b] font-medium">Detractors</span>
            <button
              type="button"
              onClick={() => setDetractorsOnly((v) => !v)}
              title="Toggle detractors view"
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${detractorsOnly ? "bg-[#ef4444]" : "bg-[#cbd5e1]"}`}
            >
              <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${detractorsOnly ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
            </button>
          </div>
        </div>

        {detractorsOnly && breakdown ? (
          <>
            <p className="text-[28px] font-bold text-[#ef4444] leading-9">{breakdown.detractors}</p>
            <p className="text-xs text-[#94a3b8] mt-1">
              {detractorPct}% of {breakdown.total} respondents
            </p>
            <div className="mt-2 h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#ef4444] transition-all" style={{ width: `${detractorPct}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <p className="text-[28px] font-bold text-[#0f172a] leading-9">{scoreLabel}</p>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7]">
                <Star className="h-5 w-5 text-[#d97706]" />
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-1">
              {npsScore !== null ? "Net Promoter Score" : "No responses yet"}
            </p>
            {breakdown && (
              <div className="flex gap-2 mt-2">
                {[
                  { label: "P", count: breakdown.promoters, color: "#10b981" },
                  { label: "N", count: breakdown.passives, color: "#f59e0b" },
                  { label: "D", count: breakdown.detractors, color: "#ef4444" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-[#64748b]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { vendorName } = useBrandingConfig();
  const [loading, setLoading] = React.useState(true);
  const [welcomeMessage, setWelcomeMessage] = React.useState<string | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);
  const [data, setData] = React.useState<DashboardData>({
    totals: { products: 0, customers: 0, completedJobs: 0 },
    dietary: [],
    totalCustomers: 0,
    integrationUsage: 0,
    trendingCats: [],
    popularProducts: [],
    activationRate: null,
    goalAchievement: [],
    roi: { budgetAdherence: null, foodWasteReduction: null, healthCostSavings: null },
    npsScore: null,
    npsBreakdown: null,
    churnData: null,
  });

  React.useEffect(() => {
    trackEvent("page_view", { page: "dashboard" });
  }, []);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [overviewRes, healthRes, runsRes, catsRes, popRes, engagementRes, welcomeRes, goalRes, roiRes, npsRes, churnRes] = await Promise.allSettled([
          apiFetch("/api/v1/analytics/overview?days=30"),
          apiFetch("/api/v1/analytics/health-summary"),
          apiFetch("/api/v1/ingest/runs"),
          apiFetch("/api/v1/search/trending-categories"),
          apiFetch("/api/v1/search/popular-products?limit=3"),
          apiFetch("/api/v1/analytics/engagement?days=30"),
          apiFetch("/api/v1/settings/branding.welcome_message"),
          apiFetch("/api/v1/analytics/goal-achievement?days=30"),
          apiFetch("/api/v1/analytics/roi"),
          apiFetch("/api/v1/analytics/nps"),
          apiFetch("/api/v1/analytics/churn"),
        ]);
        if (!alive) return;

        let totals: OverviewTotals = { products: 0, customers: 0, completedJobs: 0 };
        if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
          const j = await overviewRes.value.json().catch(() => ({}));
          const src = j.totals ?? j;
          totals = {
            products: src.products ?? 0,
            customers: src.customers ?? 0,
            completedJobs: src.completedJobs ?? src.completed_jobs ?? 0,
          };
        }

        let dietary: DietaryPref[] = [];
        let totalCustomers = totals.customers;
        if (healthRes.status === "fulfilled" && healthRes.value.ok) {
          const j = await healthRes.value.json().catch(() => ({}));
          dietary = (j.dietary_preference_distribution ?? []).slice(0, 4);
          totalCustomers = j.total_customers ?? totals.customers;
        }

        let integrationUsage = 0;
        if (runsRes.status === "fulfilled" && runsRes.value.ok) {
          const j = await runsRes.value.json().catch(() => ({}));
          const runs: IngestRun[] = toArray(j);
          integrationUsage = runs
            .filter((r) => r.status === "completed")
            .reduce((s, r) => s + (r.totalRecordsWritten ?? r.total_records_written ?? 0), 0);
        }

        let trendingCats: TrendingCat[] = [];
        if (catsRes.status === "fulfilled" && catsRes.value.ok) {
          const j = await catsRes.value.json().catch(() => ({}));
          trendingCats = toArray<TrendingCat>(j).slice(0, 6);
        }

        let popularProducts: PopularProduct[] = [];
        if (popRes.status === "fulfilled" && popRes.value.ok) {
          const j = await popRes.value.json().catch(() => ({}));
          popularProducts = toArray<PopularProduct>(j).slice(0, 3);
        }

        let activationRate: number | null = null;
        if (engagementRes.status === "fulfilled" && engagementRes.value.ok) {
          const j = await engagementRes.value.json().catch(() => ({}));
          const rate = j.activationRate ?? j.activation_rate ?? null;
          if (typeof rate === "number" && !isNaN(rate)) activationRate = rate;
        }

        if (welcomeRes.status === "fulfilled" && welcomeRes.value.ok) {
          const j = await welcomeRes.value.json().catch(() => ({}));
          const msg = j.value ?? j.welcome_message ?? null;
          if (alive && typeof msg === "string" && msg.trim()) setWelcomeMessage(msg.trim());
        }

        let goalAchievement: GoalMetric[] = [];
        if (goalRes.status === "fulfilled" && goalRes.value.ok) {
          const j = await goalRes.value.json().catch(() => ({}));
          const arr = toArray<GoalMetric>(j.metrics ?? j);
          if (arr.length > 0) goalAchievement = arr;
        }

        let roi: RoiData = { budgetAdherence: null, foodWasteReduction: null, healthCostSavings: null };
        if (roiRes.status === "fulfilled" && roiRes.value.ok) {
          const j = await roiRes.value.json().catch(() => ({}));
          roi = {
            budgetAdherence: j.budgetAdherence ?? null,
            foodWasteReduction: j.foodWasteReduction ?? null,
            healthCostSavings: j.healthCostSavings ?? null,
          };
        }

        let npsScore: number | null = null;
        let npsBreakdown: NpsBreakdown | null = null;
        if (npsRes.status === "fulfilled" && npsRes.value.ok) {
          const j = await npsRes.value.json().catch(() => ({}));
          if (typeof j.nps_score === "number") npsScore = j.nps_score;
          const total = j.total_responses ?? 0;
          if (total > 0) {
            npsBreakdown = {
              promoters: j.promoters ?? 0,
              passives: j.passives ?? 0,
              detractors: j.detractors ?? 0,
              total,
            };
          }
        }

        let churnData: ChurnData | null = null;
        if (churnRes.status === "fulfilled" && churnRes.value.ok) {
          const j = await churnRes.value.json().catch(() => ({}));
          if (typeof j.healthy === "number") {
            churnData = {
              healthy: j.healthy ?? 0,
              atRisk: j.atRisk ?? 0,
              churned: j.churned ?? 0,
              atRiskRate: j.atRiskRate ?? 0,
              atRiskCustomers: Array.isArray(j.atRiskCustomers) ? j.atRiskCustomers : [],
            };
          }
        }

        if (alive) {
          setData({ totals, dietary, totalCustomers, integrationUsage, trendingCats, popularProducts, activationRate, goalAchievement, roi, npsScore, npsBreakdown, churnData });
        }
      } catch { /* non-critical */ } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const maxCatCount = data.trendingCats[0]?.product_count ?? 1;
  const topThreeCats = data.trendingCats.slice(0, 3);

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
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[12px]" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Skeleton className="h-96 rounded-[12px]" />
              <Skeleton className="h-96 rounded-[12px]" />
            </div>
            <Skeleton className="h-32 rounded-[12px]" />
            <Skeleton className="h-64 rounded-[12px]" />
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
              <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px]">Analytics Dashboard</h1>
              <p className="text-[14px] text-[#64748b] mt-1">
                Monitor engagement, health insights, and revenue impact
                {vendorName ? ` for ${vendorName}` : ""}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#64748b] border border-[#e2e8f0] rounded-full px-3 py-1 bg-white">
              Last 30 Days
            </span>
          </div>

          {/* ── Welcome Message Banner ─────────────────────────────────────── */}
          {welcomeMessage && !welcomeDismissed && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-5 py-4">
              <Zap className="h-5 w-5 text-[#3b82f6] mt-0.5 shrink-0" />
              <p className="flex-1 text-[14px] text-[#1e40af] leading-relaxed">{welcomeMessage}</p>
              <button
                onClick={() => setWelcomeDismissed(true)}
                className="text-[#93c5fd] hover:text-[#3b82f6] transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Section 1: Engagement Overview ─────────────────────────────── */}
          <section>
            <p className="text-[13px] font-bold text-[#0f172a] mb-4">Engagement Overview</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                label="Total Members"
                value={data.totals.customers > 0 ? data.totals.customers.toLocaleString() : "—"}
                icon={Users}
                sub={data.totals.customers > 0 ? `/ ${(data.totals.customers * 10).toLocaleString()} cap` : "All time"}
                iconBg="bg-[rgba(0,67,143,0.1)]"
                iconColor="text-primary"
              />
              <AvgSessionCard />
              <KpiCard
                label="Retention Rate"
                value={data.activationRate !== null ? `${data.activationRate.toFixed(1)}%` : "—"}
                icon={TrendingUp}
                sub={data.activationRate !== null ? "Health profile activation" : "Not yet tracked"}
                iconBg="bg-[#dcfce7]"
                iconColor="text-[#059669]"
              />
              <NpsCard npsScore={data.npsScore} breakdown={data.npsBreakdown} />
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">Goal Achievement</p>
                  {data.goalAchievement.length > 0 ? (
                    <div className="space-y-3">
                      {data.goalAchievement.map((g, i) => (
                        <PctBar
                          key={g.metric}
                          label={g.metric}
                          pctVal={Math.round(g.achieved_pct)}
                          color={i === data.goalAchievement.length - 1 ? "#94a3b8" : "var(--primary)"}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94a3b8]">No goal data yet</p>
                  )}
                </div>

                {/* Top Dietary Preferences */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">Top Dietary Preferences</p>
                  {data.dietary.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No data yet</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {data.dietary.map((d) => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-[12px] text-[#475569] truncate">{d.name}</span>
                          </div>
                          <span className="text-[12px] font-semibold text-[#0f172a] ml-1 shrink-0">
                            {pct(d.customer_count, data.totalCustomers || 1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trending Meal Plans */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">Trending Meal Plans</p>
                  {data.popularProducts.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No product data yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {data.popularProducts.map((p, i) => (
                        <div
                          key={p.id}
                          className="border border-[#e2e8f0] rounded-[8px] p-2.5 flex flex-col items-center text-center gap-1.5 bg-[#f8fafc]"
                        >
                          <div className="h-8 w-8 rounded-full bg-[rgba(0,67,143,0.1)] flex items-center justify-center">
                            <span className="text-[11px] font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#1e293b] leading-tight">{p.name}</span>
                          {p.dietaryTags && p.dietaryTags.length > 0 && (
                            <span className="text-[9px] text-[#94a3b8] truncate w-full">{p.dietaryTags[0]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/analytics" className="flex items-center gap-1 text-[12px] font-bold text-primary hover:underline">
                  View Health Summary <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Right: Shopping & Revenue Impact */}
            <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#f1f5f9]">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <p className="text-[13px] font-bold text-[#0f172a]">Shopping &amp; Revenue Impact</p>
              </div>
              <CardContent className="px-5 py-4 space-y-5">

                {/* List Completion Rate */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-1">List Completion Rate</p>
                  <p className="text-[30px] font-bold text-[#0f172a]">—</p>
                  {/* Static bar chart visual */}
                  <div className="flex items-end gap-[3px] h-10 mt-2">
                    {[40, 55, 45, 60, 50, 70, 55, 75, 65, 80, 70, 85].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{ height: `${h}%`, background: i >= 8 ? "var(--primary)" : "#c7d9f0" }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].map((m) => (
                      <span key={m} className="text-[8px] text-[#94a3b8]">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Integration Usage + Avg Basket */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f8fafc] rounded-[8px] p-3 border border-[#f1f5f9]">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-[#94a3b8]">Integration Usage</p>
                    </div>
                    <p className="text-[20px] font-bold text-[#0f172a]">
                      {data.integrationUsage > 0 ? data.integrationUsage.toLocaleString() : "—"}
                    </p>
                    <p className="text-[9px] font-semibold uppercase text-[#94a3b8] mt-0.5">Total Cart Exports</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-[8px] p-3 border border-[#f1f5f9]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-[#94a3b8] mb-1">Avg. Basket Size</p>
                    <p className="text-[20px] font-bold text-[#0f172a]">—</p>
                    <p className="text-[9px] font-semibold uppercase text-[#94a3b8] mt-0.5">Per Integrated Shop</p>
                  </div>
                </div>

                {/* Product Category Insights */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#94a3b8] mb-3">Product Category Insights</p>
                  {topThreeCats.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No category data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topThreeCats.map((c) => (
                        <PctBar
                          key={c.id}
                          label={c.label}
                          pctVal={pct(c.product_count, maxCatCount)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/products" className="flex items-center gap-1 text-[12px] font-bold text-primary hover:underline">
                  View All Products <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* ── Section 3: Projected Annual ROI Banner ─────────────────────── */}
          <section
            className="rounded-[12px] p-6 text-white"
            style={{ background: "linear-gradient(110deg, var(--primary) 0%, #003070 100%)" }}
          >
            <p className="text-[13px] font-bold text-white mb-5">Projected Annual ROI &amp; Cost Savings</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/20">
              {[
                { label: "Budget Adherence", value: data.roi.budgetAdherence ?? "—", desc: "Average member spending stays within projected meal plan costs." },
                { label: "Food Waste Reduction", value: data.roi.foodWasteReduction ?? "—", desc: "Estimated monthly reduction in household food waste via planning." },
                { label: "Health Cost Savings", value: data.roi.healthCostSavings ?? "—", desc: "Projected preventive health savings across total member population." },
              ].map(({ label, value, desc }, i) => (
                <div key={label} className={i > 0 ? "pt-4 sm:pt-0 sm:pl-6" : ""}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px] text-white/60">{label}</p>
                  <p className="text-[36px] font-bold text-white mt-1">{value}</p>
                  <p className="text-[12px] text-white/70 mt-1 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 4: Churn & At-Risk Analysis ─────────────────────────── */}
          {data.churnData && (
            <section>
              <ChurnWidget data={data.churnData} />
            </section>
          )}

          {/* ── Section 5: Category Distribution Summary ────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#0f172a]">Category Distribution Summary</p>
              <Link href="/products" className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
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
                    {data.trendingCats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#94a3b8] text-sm">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-[#e2e8f0]" />
                          No category data yet
                        </td>
                      </tr>
                    ) : (
                      data.trendingCats.map((c) => {
                        const stars = c.product_count > 20 ? 5 : c.product_count > 10 ? 4 : c.product_count > 5 ? 3 : 2;
                        const usage = c.product_count >= 1000
                          ? `${(c.product_count / 1000).toFixed(1)}k users`
                          : `${c.product_count} users`;
                        return (
                          <tr
                            key={c.id}
                            className="border-b border-[#f1f5f9] last:border-0 hover:bg-[#f8fafc] transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-[#0f172a]">{c.label}</td>
                            <td className="py-3 px-4 text-right text-[#475569]">{usage}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-[#94a3b8]">—</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end">
                                <StarRating n={stars} />
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button className="p-1 rounded hover:bg-[#f1f5f9] text-[#64748b]">
                                <span className="text-base leading-none">⋮</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#f1f5f9] px-4 py-2.5 bg-[#f8fafc]/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#94a3b8] text-center">
                  Data last updated 12 minutes ago
                </p>
              </div>
            </Card>
          </section>

        </div>
      </div>
    </AppShell>
  );
}
