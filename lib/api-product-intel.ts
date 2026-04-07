import { apiFetch } from "@/lib/backend"

export interface RegionalData {
  label: string
  value: number
  description: string
}

export interface ProductIntelResponse {
  insights?: string[]
  market_position?: string
  demand_signals?: string[]
  similar_products?: Array<{ id: string; name: string; similarity?: number }>
  summary?: string
  fallback?: boolean
  market_demand_index?: number | null
  regional_popularity?: RegionalData | null
  sentiment?: RegionalData | null
}

export async function getProductIntelligence(productId: string): Promise<ProductIntelResponse> {
  const res = await apiFetch(`/api/v1/products/${productId}/intelligence`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Product intelligence failed (${res.status})`)
  }
  return data as ProductIntelResponse
}
