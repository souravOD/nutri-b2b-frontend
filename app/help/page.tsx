"use client"

import * as React from "react"
import Link from "next/link"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"

export default function HelpPage() {
  const branding = useBrandingConfig()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7f8] px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-[#0f172a]">Help Center</h1>
        <p className="text-[#64748b]">
          Support for {branding.vendorName} Vendor Portal is coming soon. Please contact your
          administrator for assistance.
        </p>
        <Link
          href="/login"
          className="inline-block text-[#0067a0] font-medium hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
