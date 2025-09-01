// app/api/customers/route.ts
import { NextResponse } from "next/server"
import { apiFetch } from "@/lib/backend"

export async function GET() {
  const res = await apiFetch("/customers")
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const res = await apiFetch("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}
