"use client"

import Link from "next/link"
import Image from "next/image"
import AppShell from "@/components/app-shell"
import OnboardingGate from "@/components/auth/OnboardingGate"
import ImportWizard from "@/components/import-wizard"
import { Button } from "@/components/ui/button"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import { FileSpreadsheet, Globe, HelpCircle } from "lucide-react"

export default function OnboardingPage() {
  const branding = useBrandingConfig()
  const vendorName = branding.vendorName

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
              Get your catalog into {vendorName} B2B
            </h1>
            <p className="text-[16px] text-[#64748b] leading-6">
              Import a CSV now or wire up your API. You can do both — start with whichever is fastest, then refine.
            </p>
          </div>

          {/* Two-card layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CSV Import card */}
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="h-[192px] bg-[#f1f5f9] flex items-center justify-center">
                <Image
                  src="/placeholder.svg"
                  alt="CSV import"
                  width={120}
                  height={120}
                  className="object-contain opacity-60"
                />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[#00438f]" />
                  <h2 className="text-[18px] font-bold text-[#0f172a]">CSV import</h2>
                </div>
                <p className="text-[14px] text-[#64748b] leading-6">
                  Drag & drop your product catalog. The wizard validates columns, previews changes, and creates an ingestion job you can monitor.
                </p>
                <ImportWizard
                  triggerLabel="Import"
                  triggerClassName="bg-[#00438f] hover:bg-[#003366] text-white font-bold text-base h-12 px-8 rounded-lg w-full sm:w-auto min-w-[160px]"
                  showTriggerIcon={false}
                />
                <p className="text-[12px] text-[#64748b]">
                  Re-run imports any time from{" "}
                  <Link href="/jobs" className="text-[#00438f] font-medium hover:underline">
                    Jobs
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* API Integration card */}
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="h-[192px] bg-[#f1f5f9] flex items-center justify-center">
                <Image
                  src="/placeholder.svg"
                  alt="API integration"
                  width={120}
                  height={120}
                  className="object-contain opacity-60"
                />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#00438f]" />
                  <h2 className="text-[18px] font-bold text-[#0f172a]">API integration</h2>
                </div>
                <p className="text-[14px] text-[#64748b] leading-6">
                  Push products directly from your PIM/ERP. Start with a single POST endpoint.
                </p>
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-[#0f172a]">Example Request (cURL)</p>
                  <pre className="text-[11px] font-mono bg-black text-[#e2e8f0] rounded-[8px] p-3 overflow-x-auto border border-[#374151]">
{`curl -X POST https://api.example.com/v1/products \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -d '{"name":"Product A","sku":"SKU001"}'`}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold text-[#0f172a]">Minimal JSON</p>
                  <pre className="text-[11px] font-mono bg-black text-[#e2e8f0] rounded-[8px] p-3 overflow-x-auto border border-[#374151]">
{`{"name":"Product A","sku":"SKU001","price":9.99}`}
                  </pre>
                </div>
                <p className="text-[12px] text-[#64748b]">
                  Need keys/webhooks? Go to{" "}
                  <Link href="/settings" className="text-[#00438f] font-medium hover:underline">
                    Settings → API
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Assistance section */}
          <div className="bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.1)] rounded-[12px] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[rgba(0,67,143,0.1)] flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-[#00438f]" />
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
