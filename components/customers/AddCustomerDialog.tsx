"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toUICustomer } from "@/types/customer"
import { useToast } from "@/hooks/use-toast"
import CustomerForm from "./CustomerForm"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddCustomerDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border-[#e2e8f0] p-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold text-[#0f172a] tracking-tight">
            Add Customer
          </DialogTitle>
          <p className="text-[#64748b] text-base mt-1">
            Enter basic info and optionally health profile, diet & allergens.
          </p>
        </DialogHeader>
        <div className="px-6 pb-6">
          <CustomerForm
            onClose={() => onOpenChange(false)}
            onCreated={(result) => {
              const created = toUICustomer(result)
              toast({ title: "Customer created", description: created.name || created.email })
              onOpenChange(false)
              router.push(`/customers/${created.id}`)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
