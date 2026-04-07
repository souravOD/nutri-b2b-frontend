import { apiFetch } from "@/lib/backend"

export interface Substitute {
  id: string
  name: string
  sku?: string
  reason?: string
  score?: number
  category?: string
}

export interface SubstitutionsResponse {
  substitutes: Substitute[]
  fallback?: boolean
}

export async function getProductSubstitutions(
  productId: string,
  opts?: { customerId?: string; limit?: number }
): Promise<SubstitutionsResponse> {
  const res = await apiFetch(`/api/v1/products/${productId}/substitutions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_id: opts?.customerId,
      limit: opts?.limit ?? 10,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Substitutions failed (${res.status})`)
  }
  return data as SubstitutionsResponse
}
