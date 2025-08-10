import { NextResponse } from "next/server"
import { seed, store } from "../../_store"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  seed()
  const job = store.jobs.find((j) => j.id === params.id)
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(job)
}
