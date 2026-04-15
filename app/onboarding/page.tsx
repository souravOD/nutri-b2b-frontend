"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import AppShell from "@/components/app-shell"
import OnboardingGate from "@/components/auth/OnboardingGate"
import ImportWizard from "@/components/import-wizard"
import { Button } from "@/components/ui/button"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import { FileSpreadsheet, Globe, HelpCircle, Copy } from "lucide-react"

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")
  : "http://localhost:5000"

const exampleBody = `{
  "records": [{
    "external_id": "SKU-12345",
    "name": "Product Name",
    "price": 29.99,
    "currency": "USD"
  }]
}`

export default function OnboardingPage() {
  const branding = useBrandingConfig()
  const vendorName = branding.vendorName
  const [copied, setCopied] = useState<"curl" | "json" | null>(null)

  const exampleCurl = `curl -X POST "${API_BASE}/api/v1/ingest/products" \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${exampleBody.replace(/\n/g, " ").replace(/\s+/g, " ")}'`

  const copyToClipboard = (text: string, which: "curl" | "json") => () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  return (
    <AppShell title="Onboarding">
      <OnboardingGate redirectOnDone={false}>
        <div className="container mx-auto p-10 space-y-8 bg-[#f5f7f8] min-h-screen">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-[12px]">
            <Link href="/dashboard" className="font-medium text-[#64748b] hover:text-[#0f172a]">
              Portal
            </Link>
            <span className="text-[#64748b]">/</span>
            <span className="font-medium text-[#0f172a]">Onboarding</span>
          </nav>

          <div className="space-y-2">
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-8">
              Get your catalog into {vendorName}
            </h1>
            <p className="text-[16px] text-[#64748b] leading-6">
              Import a CSV now or wire up your API. You can do both — start with whichever is fastest, then refine.
            </p>
          </div>

          {/* Two-card layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CSV Import card - Figma 695-12666 (image) + 695-12667 (content) */}
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="h-[192px] bg-[#f1f5f9] flex items-center justify-center overflow-hidden">
                <Image
                  src="/onboarding-illustration.png"
                  alt="CSV import"
                  width={454}
                  height={192}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex flex-col justify-between p-[32px] min-h-[92px]">
                <div className="pb-[12px]">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                    <h2 className="text-[20px] font-bold text-[#0f172a]">CSV import</h2>
                  </div>
                </div>
                <p className="text-[16px] text-[#475569] leading-[26px] pb-[32px]">
                  Drag & drop your product catalog. The wizard validates columns, previews changes, and creates an ingestion job you can monitor.
                </p>
                <div className="flex flex-col gap-[24px] items-stretch pt-[87px]">
                  <ImportWizard
                    triggerLabel="Import"
                    triggerClassName="w-full bg-primary hover:bg-[#003366] text-white font-bold text-[16px] h-12 px-6 rounded-[8px] flex items-center justify-center gap-2"
                    showTriggerIcon={true}
                  />
                  <p className="text-center text-[14px] text-[#94a3b8]">
                    Re-run imports any time from{" "}
                    <Link href="/jobs" className="text-primary hover:underline">
                      Jobs
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* API Integration card - no image per Figma 695-12685 */}
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="p-[32px] space-y-0">
                <div className="pb-[12px]">
                  <div className="flex items-center gap-2">
                    <Globe className="h-[22px] w-[22px] text-primary" />
                    <h2 className="text-[20px] font-bold text-[#0f172a]">API integration</h2>
                  </div>
                </div>
                <p className="text-[16px] text-[#475569] leading-[26px] pb-[24px]">
                  Push products directly from your PIM/ERP. Start with a single POST endpoint.
                </p>
                <div className="space-y-[16px] pb-[32px]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                        Example Request
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 px-0 text-[12px] font-bold text-primary hover:bg-transparent hover:text-[#003366]"
                        onClick={copyToClipboard(exampleCurl, "curl")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied === "curl" ? "Copied!" : "Copy cURL"}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-[8px] bg-[#020617] p-4 font-mono text-[14px] leading-[20px] text-[#34d399]">
                      <code>{exampleCurl}</code>
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                        Minimal JSON
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 px-0 text-[12px] font-bold text-primary hover:bg-transparent hover:text-[#003366]"
                        onClick={copyToClipboard(exampleBody, "json")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied === "json" ? "Copied!" : "Copy JSON"}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-[8px] bg-[#020617] p-4 font-mono text-[14px] leading-[20px] text-[#93c5fd] whitespace-pre-wrap">
                      <code>{exampleBody}</code>
                    </pre>
                  </div>
                </div>
                <div className="border-t border-[#f1f5f9] pt-[17px]">
                  <p className="text-[14px] text-[#64748b]">
                    Need keys/webhooks? Go to{" "}
                    <Link href="/settings" className="font-medium text-primary hover:underline">
                      Settings → API
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assistance section */}
          <div className="bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.1)] rounded-[12px] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[rgba(0,67,143,0.1)] flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-[16px] font-bold text-[#0f172a]">Need help with mapping?</h3>
              <p className="text-[14px] text-[#64748b]">
                View our comprehensive integration guide and field definitions.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[#e2e8f0] bg-white font-semibold text-sm text-[#0f172a] rounded-lg shrink-0"
              asChild
            >
              <Link href="/settings">Read Docs</Link>
            </Button>
          </div>
        </div>
      </OnboardingGate>
    </AppShell>
  )
}
