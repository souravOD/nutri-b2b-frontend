import { NextResponse } from "next/server"
import { seed, store } from "../_store"

export async function GET() {
  seed()
  return NextResponse.json({ items: store.customers })
}
