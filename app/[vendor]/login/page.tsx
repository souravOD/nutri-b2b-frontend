"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"
import { account } from "@/lib/appwrite"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"

interface VendorLoginPageProps {
  params: { vendor: string }
}

export default function VendorLoginPage({ params }: VendorLoginPageProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const branding = useBrandingConfig(params.vendor)
  const blockAutoRedirect =
    !!sp.get("auth_error") ||
    sp.get("needs_admin_attach") === "1" ||
    sp.get("vendor_match_failed") === "1"

  React.useEffect(() => {
    if (blockAutoRedirect) return
    let done = false
    ;(async () => {
      try {
        const me = await account.get()
        if (!done && me?.$id) router.replace("/dashboard")
      } catch {
        /* not signed in -> stay on login */
      }
    })()
    return () => { done = true }
  }, [router, blockAutoRedirect])

  return (
    <AuthLayout
      vendorName={branding.vendorName}
      title="Sign in to B2B portal"
      subtitle="Enter your credentials to access your account"
      copyrightText={branding.copyrightText}
    >
      <LoginForm />
    </AuthLayout>
  )
}
