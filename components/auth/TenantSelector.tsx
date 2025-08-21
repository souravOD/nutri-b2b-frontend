"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TenantSelector() {
  const [vendorSlug, setVendorSlug] = React.useState("")
  const router = useRouter()

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (vendorSlug.trim()) {
      router.push(`/${vendorSlug.trim().toLowerCase()}/login`)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Select Tenant</CardTitle>
        <CardDescription>Enter your vendor slug to access your branded login page</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleContinue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor Slug</Label>
            <Input
              id="vendor"
              type="text"
              value={vendorSlug}
              onChange={(e) => setVendorSlug(e.target.value)}
              placeholder="e.g., acme, foodcorp, healthyeats"
              required
            />
            <p className="text-sm text-muted-foreground">This will take you to /{vendorSlug || "vendor"}/login</p>
          </div>
          <Button type="submit" className="w-full" disabled={!vendorSlug.trim()}>
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
