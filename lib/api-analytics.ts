import { apiFetch } from "@/lib/backend";

export type HealthSummary = {
  allergen_distribution: { name: string; customer_count: number }[];
  health_condition_distribution: { name: string; customer_count: number }[];
  dietary_preference_distribution: { name: string; customer_count: number }[];
  total_customers: number;
};

export type AnalyticsOverview = {
  productTrend: { day: string; count: number }[];
  customerTrend: { day: string; count: number }[];
  runTrend: { day: string; count: number }[];
  totals: { products: number; customers: number; completedJobs: number };
  days: number;
};

export async function getHealthSummary(): Promise<HealthSummary> {
  const res = await apiFetch("/api/v1/analytics/health-summary");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Health summary failed (${res.status})`);
  }
  return data as HealthSummary;
}
export async function getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
  const res = await apiFetch(`/api/v1/analytics/overview?days=${days}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Analytics overview failed (${res.status})`);
  }
  return data as AnalyticsOverview;
}

