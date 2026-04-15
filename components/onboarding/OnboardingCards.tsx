"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import ImportWizard from "@/components/import-wizard"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Code2, HelpCircle, Copy } from "lucide-react"

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")
  : "http://localhost:5000"

const exampleBody = `{
  "external_id": "SKU-12345",
  "name": "Product Name",
  "price": 29.99,
  "currency": "USD"
}`

export default function OnboardingCards() {
  const [copied, setCopied] = React.useState<"curl" | "schema" | null>(null)
  const copy = (text: string, which: "curl" | "schema") => () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const exampleCurl = `curl -X POST "${API_BASE}/api/v1/ingest/products" \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${exampleBody.replace(/\n/g, " ").replace(/\s+/g, " ")}'`

  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "/settings"

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-2 md:gap-[32px]">
        {/* CSV Import Card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <div className="flex h-[192px] w-full items-center justify-center overflow-hidden bg-[#f1f5f9]">
            <Image
              src="/placeholder.svg"
              alt=""
              width={200}
              height={120}
              className="object-contain opacity-60"
            />
          </div>
          <div className="flex flex-1 flex-col justify-between p-8">
            <div className="space-y-3 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#0f172a]" />
                <h2 className="text-[20px] font-bold text-[#0f172a]">CSV import</h2>
              </div>
              <p className="text-[16px] leading-[26px] text-[#475569]">
                Drag & drop your product catalog. The wizard validates columns, previews changes,
                and creates an ingestion job you can monitor.
              </p>
            </div>
            <div className="flex flex-col gap-6 pt-6">
              <ImportWizard
                triggerLabel="Import"
                triggerClassName="w-full bg-primary hover:bg-[#003366] text-white font-bold rounded-[8px] py-3 text-[16px]"
                showTriggerIcon={false}
              />
              <p className="text-center text-[14px] text-[#94a3b8]">
                Re-run imports any time from{" "}
                <Link href="/jobs" className="font-medium text-primary hover:underline">
                  Jobs
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* API Integration Card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-1 flex-col justify-between p-8">
            <div className="space-y-3 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-[22px] w-[22px] shrink-0 text-[#0f172a]" />
                <h2 className="text-[20px] font-bold text-[#0f172a]">API integration</h2>
              </div>
              <p className="text-[16px] leading-[26px] text-[#475569]">
                Push products directly from your PIM/ERP. Start with a single POST endpoint.
              </p>
            </div>

            <div className="space-y-6 pb-6">
              {/* Example Request */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                    Example Request
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 px-0 text-[12px] font-bold text-primary hover:bg-transparent hover:text-[#003366]"
                    onClick={copy(exampleCurl, "curl")}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "curl" ? "Copied!" : "Copy cURL"}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-[8px] bg-[#020617] p-4 font-mono text-[14px] leading-[20px] text-[#34d399]">
                  <code>{exampleCurl}</code>
                </pre>
              </div>

              {/* Minimal JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#64748b]">
                    Minimal JSON
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 px-0 text-[12px] font-bold text-primary hover:bg-transparent hover:text-[#003366]"
                    onClick={copy(exampleBody, "schema")}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "schema" ? "Copied!" : "Copy JSON"}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-[8px] bg-[#020617] p-4 font-mono text-[14px] leading-[20px] text-[#93c5fd] whitespace-pre-wrap">
                  <code>{exampleBody}</code>
                </pre>
              </div>
            </div>

            <div className="border-t border-[#f1f5f9] pt-4">
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

      {/* Assistance Section */}
      <div className="flex items-center justify-between rounded-[12px] border border-[rgba(0,67,143,0.1)] bg-[rgba(0,67,143,0.05)] px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(0,67,143,0.1)]">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#0f172a]">Need help with mapping?</h3>
            <p className="text-[14px] text-[#475569]">
              View our comprehensive integration guide and field definitions.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-[#e2e8f0] rounded-[8px] font-bold text-[#0f172a]"
          asChild
        >
          <Link href={docsUrl}>Read Docs</Link>
        </Button>
      </div>
    </div>
  )
}
