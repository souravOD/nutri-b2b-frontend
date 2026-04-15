"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSuggestedVendors, type SuggestedVendor } from "@/lib/api-search"

function vendorInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("")
}

export default function SuggestedVendorsSection() {
  const [vendors, setVendors] = useState<SuggestedVendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSuggestedVendors(5)
      .then(setVendors)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-bold text-[#0f172a]">Suggested Vendors for You</h2>
        <Link
          href="/vendors"
          className="text-[14px] font-medium text-primary hover:underline"
        >
          See all vendors
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-[8px] border border-[#e2e8f0] p-4">
              <Skeleton className="h-14 w-14 rounded-[8px] shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-9 w-28 shrink-0" />
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? null : (
        <div className="flex flex-col gap-3">
          {vendors.map((vendor) => {
            const isActive = vendor.status?.toLowerCase() === "active"
            const description = vendor.contactEmail ?? vendor.slug ?? ""

            return (
              <div
                key={vendor.id}
                className="flex items-center gap-4 rounded-[8px] border border-[#e2e8f0] bg-white px-5 py-4"
              >
                {/* Logo / Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] text-[16px] font-bold text-[#64748b]">
                  {vendorInitials(vendor.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[16px] font-semibold text-[#0f172a] truncate">
                      {vendor.name}
                    </span>
                    {isActive && (
                      <Badge className="bg-[#e8f0fb] text-primary hover:bg-[#e8f0fb] text-[11px] font-semibold px-2 py-0">
                        PREFERRED
                      </Badge>
                    )}
                  </div>
                  {description && (
                    <p className="text-[14px] text-[#64748b] truncate">{description}</p>
                  )}
                </div>

                {/* Action */}
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 border-[#e2e8f0] text-[#0f172a] hover:border-primary/40 hover:text-primary"
                >
                  <Link href="/vendors">View Profile</Link>
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
