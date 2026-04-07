"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { getCustomer } from "@/lib/api-customers"
import type { UICustomer } from "@/types/customer"
import CustomerProductMatchingView from "@/components/customers/CustomerProductMatchingView"

export default function CustomerMatchesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined

  const [customer, setCustomer] = React.useState<UICustomer | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) {
      router.replace("/customers")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getCustomer(id)
      .then((data) => {
        if (!cancelled) setCustomer(data)
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Failed to load customer")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, router])

  React.useEffect(() => {
    if (!loading && error) {
      router.replace("/customers")
    }
  }, [loading, error, router])

  if (!id) return null

  if (loading) {
    return (
      <AppShell title="Product Matching" subtitle="Loading...">
        <div className="space-y-6 p-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !customer) return null

  return (
    <AppShell title={customer.name} subtitle="Product matching">
      <CustomerProductMatchingView
        customer={customer}
        onDeleted={() => router.replace("/customers")}
        onSaved={(updated) => setCustomer(updated)}
      />
    </AppShell>
  )
}
