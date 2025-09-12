import { apiFetch } from "@/lib/backend";

function pluckItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  return raw?.data ?? raw?.items ?? [];
}

export async function getMatches(customerId: string, limit?: number) {
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const res = await apiFetch(`/matching/${customerId}${qs}`);
  const json = await res.json();
  return pluckItems(json);
}
