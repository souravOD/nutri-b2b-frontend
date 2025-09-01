// app/api/customers/[id]/route.ts
import { NextResponse } from "next/server"
import { apiFetch } from "@/lib/backend"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const res = await apiFetch(`/customers/${params.id}`)
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null)
  const res = await apiFetch(`/customers/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  return PUT(request, ctx)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const res = await apiFetch(`/customers/${params.id}`, { method: "DELETE" })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}
