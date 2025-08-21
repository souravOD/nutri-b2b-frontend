import { NextResponse } from "next/server"
import { seed, store } from "../../_store"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  seed()
  const item = store.products.find((p) => p.id === params.id)
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  seed()
  const i = store.products.findIndex((p) => p.id === params.id)
  if (i === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json()
  store.products[i] = { ...store.products[i], ...body, updatedAt: new Date().toISOString() }
  return NextResponse.json(store.products[i])
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  seed()
  const i = store.products.findIndex((p) => p.id === params.id)
  if (i === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const [removed] = store.products.splice(i, 1)
  return NextResponse.json(removed)
}
