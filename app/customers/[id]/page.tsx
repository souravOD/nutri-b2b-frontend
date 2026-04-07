"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { getCustomer } from "@/lib/api-customers"
import type { UICustomer } from "@/types/customer"
import CustomerProfileDetailView from "@/components/customers/CustomerProfileDetailView"
import PHIAccessDialog from "@/components/customers/PHIAccessDialog"

const PHI_SESSION_KEY = (id: string) => `phi-access-${id}`

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined

  // Check if user already confirmed PHI access this session
  const storedReason = React.useMemo(() => {
    if (typeof window === "undefined" || !id) return null
    return sessionStorage.getItem(PHI_SESSION_KEY(id)) ?? null
  }, [id])

  const [phiReason, setPhiReason] = React.useState<string | null>(storedReason)
  const [customer, setCustomer] = React.useState<UICustomer | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Only fetch customer data after PHI consent is given (reason is set)
  React.useEffect(() => {
    if (!id) {
      router.replace("/customers")
      return
    }
    if (phiReason === null) return // wait for consent
    let cancelled = false
    setLoading(true)
    setError(null)
    getCustomer(id, { reasonForAccess: phiReason })
      .then((data) => {
        if (!cancelled) setCustomer(data)
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load customer")
          sessionStorage.removeItem(PHI_SESSION_KEY(id))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, phiReason, router])

  // Error is shown inline — do not auto-redirect so the user sees what went wrong

  if (!id) return null

  // PHI consent not yet given — show dialog over an empty shell
  if (phiReason === null) {
    return (
      <AppShell title="Customer" subtitle="Protected Health Information">
        <PHIAccessDialog
          open={true}
          customerName="this customer"
          onConfirm={(reason) => {
            sessionStorage.setItem(PHI_SESSION_KEY(id), reason)
            setPhiReason(reason)
          }}
          onCancel={() => router.replace("/customers")}
        />
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell title="Customer" subtitle="Loading...">
        <div className="space-y-6 p-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Customer" subtitle="Error">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-[#64748b] text-sm max-w-sm">{error}</p>
          <button
            onClick={() => router.replace("/customers")}
            className="px-4 py-2 text-sm font-medium text-[#00438f] border border-[#e2e8f0] rounded-lg hover:bg-[#f1f5f9] transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </AppShell>
    )
  }
  if (!customer) return null

  return (
    <AppShell title={customer.name} subtitle="Customer profile">
      <CustomerProfileDetailView
        customer={customer}
        onDeleted={() => router.replace("/customers")}
        onSaved={(updated) => setCustomer(updated)}
      />
    </AppShell>
  )
}
