export type Product = {
  id: string
  name: string
  sku: string
  status: "active" | "inactive"
  category: string
  tags: string[]
  imageUrl?: string
  updatedAt: string
}
export type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  status: "active" | "archived"
  restrictions: {
    required: string[]
    preferred: string[]
    allergens: string[]
    conditions: string[]
    notes?: string
  }
}
export type Job = {
  id: string
  type: string
  source: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  errorCount: number
  createdAt: string
  updatedAt: string
}

type Store = {
  products: Product[]
  customers: Customer[]
  jobs: Job[]
  seeded?: boolean
}
const g = globalThis as any
if (!g.__odysseyStore) {
  g.__odysseyStore = { products: [], customers: [], jobs: [], seeded: false } as Store
}
export const store: Store = g.__odysseyStore

export function seed() {
  if (store.seeded) return
  const now = new Date()
  store.products = Array.from({ length: 42 }).map((_, i) => ({
    id: `p-${i + 1}`,
    name: `Product ${i + 1}`,
    sku: `SKU-${1000 + i}`,
    status: i % 5 === 0 ? "inactive" : "active",
    category: ["Beverages", "Snacks", "Dairy", "Bakery"][i % 4],
    tags: ["Gluten-Free", "Vegan", "Organic", "Low-Sugar"].filter((_, t) => (i + t) % 2 === 0),
    imageUrl: "/diverse-products-still-life.png",
    updatedAt: new Date(now.getTime() - i * 3600_000).toISOString(),
  }))
  store.customers = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1-555-1234",
      status: "active",
      restrictions: {
        required: ["No Peanuts"],
        preferred: ["Vegan", "Organic"],
        allergens: ["Peanuts", "Dairy"],
        conditions: ["Celiac"],
        notes: "Prefers low sugar",
      },
    },
  ]
  store.jobs = []
  store.seeded = true
}

export function createJob(payload: Omit<Job, "id" | "createdAt" | "updatedAt">): Job {
  const id = `j-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  const job: Job = { id, createdAt: now, updatedAt: now, ...payload }
  store.jobs.unshift(job)
  // simulate progress
  setTimeout(() => advanceJob(id, 10), 300)
  setTimeout(() => advanceJob(id, 35), 1200)
  setTimeout(() => advanceJob(id, 60), 2200)
  setTimeout(() => advanceJob(id, 85), 3200)
  setTimeout(() => advanceJob(id, 100), 4500)
  return job
}

function advanceJob(id: string, progress: number) {
  const j = store.jobs.find((x) => x.id === id)
  if (!j) return
  j.progress = progress
  j.status = progress >= 100 ? "completed" : progress > 0 ? "processing" : j.status
  j.updatedAt = new Date().toISOString()
}
