// components/customers/CustomerDetailsDialog.tsx
"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, X } from "lucide-react"
import CustomerDetailView from "./CustomerDetailView"
import type { UICustomer } from "@/types/customer"
import { getCustomer } from "@/lib/api-customers"

type Props = {
  open: boolean
  id?: string
  onOpenChange: (open: boolean) => void
}

export default function CustomerDetailsDialog({ open, id, onOpenChange }: Props) {
  const [customer, setCustomer] = useState<UICustomer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setCustomer(null); setError(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const data = await getCustomer(String(id))
        if (!cancelled) setCustomer(data)
      } catch {
        if (!cancelled) setError("Failed to load customer")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }
    if (!customer) return null
    return <CustomerDetailView customer={customer}  />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Softer, blurred overlay */}
        <DialogOverlay className="
          fixed inset-0 z-40 bg-black/60 backdrop-blur-sm
          data-[state=open]:animate-in data-[state=open]:fade-in-0
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0
        " />
        {/* Big, centered content with no outer padding; sticky header */}
        <DialogContent
          className="
                fixed left-1/2 top-1/2 z-50
                w-[min(98vw,1440px)] sm:max-w-none   /* <-- remove the 425px cap */
                max-h-[92vh]
                -translate-x-1/2 -translate-y-1/2
                overflow-hidden rounded-2xl border bg-background shadow-2xl
                p-0
            "
          style={{ maxWidth: "none" }}
        >
          {/* Header */}
          <div className="
            sticky top-0 z-10 flex items-start justify-between gap-3
            border-b bg-background/80 px-5 py-4
            backdrop-blur supports-[backdrop-filter]:bg-background/60
          ">
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl font-semibold">
                {customer ? customer.name : loading ? "Loading..." : "Customer Details"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                View profile, contact info, tags and matching preferences.
              </DialogDescription>
            </div>
            <DialogClose
              className="rounded-md p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-6 py-6 md:px-8 md:py-8">
            {renderContent()}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
