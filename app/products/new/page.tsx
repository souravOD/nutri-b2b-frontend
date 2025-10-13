"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import AppShell from "@/components/app-shell"
import ProductForm from "@/components/product-form"

export default function NewProductPage() {
  const router = useRouter()
  const [open, setOpen] = React.useState(true)

  return (
    <AppShell title="Add Product">
      {/* Render the dialog open by default; closing returns to products list */}
      <ProductForm
        mode="create"
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) router.push("/products")
        }}
        renderTrigger={false}
        onSaved={() => {
          router.push("/products")
        }}
      />
      {/* Optional helper when JS navigation hasn’t triggered yet */}
      {!open && (
        <div className="text-sm text-muted-foreground">Redirecting to products…</div>
      )}
    </AppShell>
  )
}

