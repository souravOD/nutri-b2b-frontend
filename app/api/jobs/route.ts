import { NextResponse } from "next/server"
import { seed, store, createJob } from "../_store"

export async function GET() {
  seed()
  return NextResponse.json({ items: store.jobs })
}

export async function POST(req: Request) {
  seed()
  const body = await req.json()
  const job = createJob({
    type: body.type ?? "import",
    source: body.source ?? "CSV",
    status: "queued",
    progress: 0,
    errorCount: Math.random() < 0.2 ? 3 : 0,
  })
  return NextResponse.json(job, { status: 201 })
}
