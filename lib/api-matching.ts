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

export async function previewMatches(customerId: string, body: {
  required?: string[]; preferred?: string[]; allergens?: string[]; conditions?: string[]; limit?: number;
}) {
  const res = await apiFetch(`/matching/${encodeURIComponent(customerId)}/preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return (Array.isArray(json) ? json : (json?.data ?? json?.items ?? [])) as any[];
}