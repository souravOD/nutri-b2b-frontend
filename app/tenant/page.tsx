"use client"

import AppShell from "@/components/app-shell"
import TenantSelector from "@/components/auth/TenantSelector"

export default function TenantPage() {
  return (
    <AppShell title="Tenant Selector">
      <div className="p-6 space-y-6">
        <TenantSelector />
      </div>
    </AppShell>
  )
}
