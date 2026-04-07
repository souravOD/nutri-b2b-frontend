"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ArrowLeft } from "lucide-react"
import { getCustomer } from "@/lib/api-customers"
import type { UICustomer } from "@/types/customer"
import CustomerEditForm from "@/components/customers/CustomerEditForm"

export default function EditCustomerPage() {
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
      .catch((e: unknown) => {
        if (!cancelled) setError((e as Error)?.message || "Failed to load customer")
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
      <AppShell title="Edit Customer" subtitle="Loading...">
        <div className="space-y-6 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-8">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !customer) return null

  return (
    <AppShell title="Edit Customer Profile" subtitle={`Updating health and dietary targets for ${customer.name}`}>
      <div className="bg-[#f5f7f8] min-h-full">
        {/* Header: Back + Breadcrumbs + Title + Actions */}
        <div className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              className="border-[#00438f] text-[#00438f] hover:bg-[#00438f]/10"
              asChild
            >
              <Link href="/customers" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </Link>
            </Button>
          </div>
          <nav className="flex items-center gap-2 text-sm text-[#64748b] mb-4">
            <Link href="/dashboard" className="hover:text-[#0f172a]">Portal</Link>
            <span>/</span>
            <Link href="/customers" className="hover:text-[#0f172a]">Customers</Link>
            <span>/</span>
            <Link href={`/customers/${id}`} className="hover:text-[#0f172a]">{customer.name}</Link>
            <span>/</span>
            <span className="font-medium text-[#0f172a]">Edit Profile</span>
          </nav>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Edit Customer Profile</h1>
              <p className="mt-1 text-base text-[#64748b]">
                Updating health and dietary targets for {customer.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <CustomerEditForm
            customer={customer}
            onCancel={() => router.push(`/customers/${id}`)}
            onSaved={(updated) => {
              setCustomer(updated)
              router.push(`/customers/${id}`)
            }}
            onDeleted={() => router.replace("/customers")}
          />
        </div>
      </div>
    </AppShell>
  )
}
