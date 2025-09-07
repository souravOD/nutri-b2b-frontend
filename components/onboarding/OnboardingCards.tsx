"use client"

import * as React from "react"
import ImportWizard from "@/components/import-wizard"
import { Button } from "@/components/ui/button"

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted/60 rounded-md p-3 overflow-x-auto text-xs">
      <code>{children}</code>
    </pre>
  )
}

export default function OnboardingCards() {
  const [copied, setCopied] = React.useState<"curl" | "schema" | null>(null)
  const copy = (text: string, which: "curl" | "schema") => () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const exampleBody = `{
  "name": "Organic Almond Butter 16oz",
  "sku": "ALM-16-ORG",
  "brand": "Odyssey",
  "price": 9.99,
  "upc": "0123456789012",
  "ingredients": ["Almonds"],
  "allergens": ["Tree Nuts"],
  "dietary": ["Vegan", "Gluten-Free"]
}`

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain"

  const exampleCurl = `curl -X POST "${origin}/api/ingest/products" \\
  -H "Content-Type: application/json" \\
  -d '${exampleBody.replace(/\n/g, " ")}'`

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* CSV Import */}
      <div className="rounded-xl border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">CSV import</h2>
          <p className="text-sm text-muted-foreground">
            Drag & drop your product catalog. The wizard validates columns, previews
            changes, and creates an ingestion job you can monitor.
          </p>
        </div>

        <div className="mt-4">
          <ImportWizard />
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Re-run imports any time from <span className="font-medium">Jobs</span>.
        </div>
      </div>

      {/* API Integration */}
      <div className="rounded-xl border bg-background p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">API integration</h2>
          <p className="text-sm text-muted-foreground">
            Push products directly from your PIM/ERP. Start with a single POST endpoint.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide">Example request</div>
            <Code>{exampleCurl}</Code>
            <Button size="sm" className="mt-2" onClick={copy(exampleCurl, "curl")}>
              {copied === "curl" ? "Copied!" : "Copy cURL"}
            </Button>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide">Minimal JSON</div>
            <Code>{exampleBody}</Code>
            <Button size="sm" className="mt-2" variant="outline" onClick={copy(exampleBody, "schema")}>
              {copied === "schema" ? "Copied!" : "Copy JSON"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Need keys/webhooks? Go to <span className="font-medium">Settings → API</span>.
          </div>
        </div>
      </div>
    </div>
  )
}
