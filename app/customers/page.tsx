"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import CustomerDetailView from "@/components/customers/CustomerDetailView"
import { Skeleton } from "@/components/ui/skeleton"

type Customer = { id: string | number; [k: string]: any }
type CustomersResponse =
  | { items?: Customer[] }
  | Customer[]
  | null

function getFirstId(payload: CustomersResponse): string | number | null {
  if (!payload) return null
  // Support both shapes: { items: [...] } and [...]
  const list = Array.isArray(payload) ? payload : (payload.items ?? [])
  const first = list?.[0]
  return first?.id ?? null
}

export default function CustomersIndexPage() {
  const [customerId, setCustomerId] = React.useState<string | number | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/customers", { cache: "no-store" })
        const data: CustomersResponse = await res.json()
        if (!cancelled) {
          const firstId = getFirstId(data)
          setCustomerId(firstId ?? "1") // fallback mock id
        }
      } catch {
        if (!cancelled) setCustomerId("1") // fallback mock id
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <AppShell title="Customers">
        <div className="container mx-auto p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (customerId == null) {
    return (
      <AppShell title="Customers">
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No customers found</h2>
            <p className="text-muted-foreground">
              There are no customers to display.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Customers">
      <CustomerDetailView customerId={customerId} />
    </AppShell>
  )
}
