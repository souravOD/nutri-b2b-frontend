"use client"

import AppShell from "@/components/app-shell"
import CustomerDetailView from "@/components/customers/CustomerDetailView"

export default function CustomerByIdPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title="Customer">
      <CustomerDetailView customerId={params.id} />
    </AppShell>
  )
}
