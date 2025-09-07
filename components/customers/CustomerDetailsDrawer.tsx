"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import CustomerDetailView from "./CustomerDetailView"
import type { UICustomer } from "@/types/customer"
import { getCustomer } from "@/lib/api-customers";
import { apiFetch } from "@/lib/backend";

type Props = {
  open: boolean
  id?: string
  onOpenChange: (open: boolean) => void
}

export default function CustomerDetailsDrawer({ open, id, onOpenChange }: Props) {
  const [customer, setCustomer] = useState<UICustomer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setCustomer(null); setError(null); return }
    let cancelled = false
    setLoading(true); setError(null)

    ;(async () => {
      try {
        const data = await getCustomer(String(id))   // hits /customers?id=<uuid> via apiFetch
        if (!cancelled) setCustomer(data)
      } catch (e) {
        if (!cancelled) setError("Failed to load customer")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
  if (!open || !id) {
    setCustomer(null)
    setError(null)
    return
  }

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      // This already normalizes shape -> UICustomer (and includes healthProfile if backend returned it)
      const data = await getCustomer(String(id))
      setCustomer(data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer")
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  run()
}, [open, id])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6 p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )
    }

    if (!customer) {
      return (
        <div className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No customer selected</AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="p-6 space-y-6">
        {/* Profile card */}
        <div className="rounded-md border p-4">
          <div className="text-base font-semibold">{customer.name || "Unnamed Customer"}</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-medium break-words">{customer.email || "—"}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="text-sm font-medium break-words">{customer.phone || "—"}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-sm font-medium capitalize">{customer.status || "—"}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Updated</div>
              <div className="text-sm font-medium">{customer.updatedAt || "—"}</div>
            </div>
          </div>

          {customer.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {customer.tags.map((t) => (
                <span key={t} className="rounded-full border px-2 py-0.5 text-xs">{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Existing matches/notes/etc. UI */}
        <CustomerDetailView customer={customer}  />
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto" aria-describedby="customer-details-desc">
        <SheetHeader className="pb-6">
          <SheetTitle>{customer ? customer.name : loading ? "Loading..." : "Customer Details"}</SheetTitle>
          <SheetDescription id="customer-details-desc">
            View profile, contact info, tags and matching preferences.
          </SheetDescription>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
      
    </Sheet>
  )
}
