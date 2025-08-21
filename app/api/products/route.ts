import { NextResponse } from "next/server"
import { seed, store, type Product } from "../_store"

export async function GET() {
  seed()
  return NextResponse.json({ items: store.products })
}

export async function POST(req: Request) {
  seed()
  const body = await req.json()
  const id = `p-${Math.random().toString(36).slice(2, 8)}`
  const p: Product = {
    id,
    name: body.name ?? "Untitled",
    sku: body.sku ?? id,
    status: body.status ?? "active",
    category: body.category ?? "Uncategorized",
    tags: body.tags ?? [],
    imageUrl: "/diverse-products-still-life.png",
    updatedAt: new Date().toISOString(),
  }
  store.products.unshift(p)
  return NextResponse.json(p, { status: 201 })
}
