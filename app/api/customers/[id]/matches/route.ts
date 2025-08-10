import { NextResponse } from "next/server"
import { seed, store } from "../../../_store"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  seed()
  const cust = store.customers.find((c) => c.id === params.id) ?? store.customers[0]
  const items = store.products.slice(0, 12).map((p) => {
    // simple pseudo-scoring
    let score = 50
    if (p.tags.some((t) => cust.restrictions.preferred.includes(t))) score += 20
    if (cust.restrictions.allergens.some((a) => p.tags.join(" ").includes(a))) score -= 30
    score = Math.max(0, Math.min(100, score))
    const compliance = {
      pass: p.tags.filter((t) => cust.restrictions.preferred.includes(t)),
      warn: p.tags.filter((t) => ["Sugar"].includes(t)),
      fail: cust.restrictions.allergens.filter((a) => p.tags.join(" ").includes(a)),
    }
    return { product: p, score, compliance }
  })
  return NextResponse.json({ items })
}
