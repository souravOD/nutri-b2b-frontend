import { apiFetch } from "@/lib/backend";

export async function getProductNotes(productId: string): Promise<string | null> {
  const res = await apiFetch(`/products/${encodeURIComponent(productId)}`);
  const data = await res.json().catch(() => null);
  const obj = Array.isArray(data) ? data[0] : (data?.data ?? data);
  return (obj?.notes ?? null) as string | null;
}

export async function setProductNotes(productId: string, note: string | null) {
  const res = await apiFetch(`/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify({ notes: note ?? null }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.detail || d?.message || `Save failed (${res.status})`);
  }
  return await res.json();
}

