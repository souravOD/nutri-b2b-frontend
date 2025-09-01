import { apiFetch } from "@/lib/backend";

function pluckItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  return raw?.data ?? raw?.items ?? [];
}

export async function getMatches(customerId: string) {
  const res = await apiFetch(`/matching/${customerId}`);
  const json = await res.json();
  return pluckItems(json);
}
