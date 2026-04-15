"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { account } from "@/lib/appwrite"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import { Button } from "@/components/ui/button"
import { CheckCircle2, HelpCircle, User } from "lucide-react"
import Link from "next/link"

export default function AccountCreatedPage() {
  const router = useRouter()
  const branding = useBrandingConfig()
  const [ready, setReady] = React.useState(false)

  const welcomeMessage =
    branding.vendorName === "B2B Portal"
      ? "Welcome to the B2B portal. You can now access your workspace and start managing your products and customers."
      : `Welcome to the ${branding.vendorName} B2B portal. You can now access your workspace and start managing your products and customers.`

  React.useEffect(() => {
    let done = false
    ;(async () => {
      try {
        const me = await account.get()
        if (!done && !me?.$id) {
          router.replace("/login")
          return
        }
      } catch {
        if (!done) router.replace("/login")
        return
      }
      if (!done) setReady(true)
    })()
    return () => { done = true }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f8]">
        <p className="text-sm text-[#64748b]">Loading…</p>
      </div>
    )
  }

  const initial = branding.vendorName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7f8]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] shrink-0">
        <div className="max-w-[1280px] mx-auto h-[52px] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#002c5d] flex items-center justify-center text-white font-bold text-lg shrink-0">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[16px] text-[#0f172a] tracking-[0.8px] uppercase leading-5">
                {branding.vendorName}
              </span>
              <span className="font-medium text-[12px] text-[#64748b] leading-4">
                Vendor Portal
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[rgba(0,67,143,0.1)] flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center py-[134px] pb-[160px] px-6">
        <div className="w-full max-w-[600px]">
          <div className="bg-white border border-[#f1f5f9] rounded-xl shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Success icon area */}
            <div
              className="h-[192px] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(180deg, rgba(220, 232, 239, 0.5) 0%, rgba(0, 67, 143, 0.05) 100%)",
              }}
            >
              <div className="w-[90px] h-[90px] rounded-full border-2 border-primary/20 flex items-center justify-center bg-white/80">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Content */}
            <div className="px-12 pt-12 pb-10">
              <h1 className="text-[30px] font-bold text-[#0f172a] text-center tracking-[-0.75px] leading-[37.5px]">
                Account Created Successfully
              </h1>
              <p className="mt-6 text-[18px] text-[#475569] text-center leading-[29px] max-w-[448px] mx-auto">
                {welcomeMessage}
              </p>

              <div className="mt-10 space-y-4">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full h-14 rounded-lg bg-primary hover:bg-[#003366] text-white font-semibold text-base"
                >
                  Go to Dashboard
                </Button>
                <div className="flex justify-center pt-4">
                  <Link
                    href="/help"
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Need help? Contact {branding.vendorName} support
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer inside card - inline: copyright left, Privacy + Terms right */}
            <div className="bg-[#f8fafc] border-t border-[#f1f5f9] px-8 py-4 flex items-center justify-between">
              <p className="text-[12px] text-[#64748b]">
                © 2024 {branding.vendorName === "B2B Portal" ? "B2B Solutions" : `${branding.vendorName} B2B Solutions`}
              </p>
              <div className="flex items-center gap-4 text-[12px] text-[#64748b]">
                <a href="/privacy" className="hover:text-[#0f172a] transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="hover:text-[#0f172a] transition-colors">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
