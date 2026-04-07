"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"
import { account } from "@/lib/appwrite"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import { Clock } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const branding = useBrandingConfig()
  const reason = sp.get("reason")
  const blockAutoRedirect =
    !!sp.get("auth_error") ||
    sp.get("needs_admin_attach") === "1" ||
    sp.get("vendor_match_failed") === "1" ||
    reason === "timeout"

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
      {reason === "timeout" && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Your session expired due to inactivity. Please sign in again.</span>
        </div>
      )}
      <LoginForm />
    </AuthLayout>
  )
}
