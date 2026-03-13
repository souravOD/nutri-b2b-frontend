"use client"

import * as React from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import {
  Upload,
  Package,
  Users,
  ShieldCheck,
  ExternalLink,
  Mail,
  BookOpen,
} from "lucide-react"

const QUICK_LINKS = [
  { label: "Import Data", description: "Upload CSV or connect via API", href: "/jobs", icon: Upload },
  { label: "Manage Products", description: "Browse and edit your product catalog", href: "/products", icon: Package },
  { label: "Customer Profiles", description: "View and manage customer data", href: "/customers", icon: Users },
  { label: "Compliance Rules", description: "Configure and audit compliance checks", href: "/compliance", icon: ShieldCheck },
]

const FAQS = [
  {
    q: "How do I import products?",
    a: "Go to Jobs → click 'Import Data'. You can upload a CSV file or connect a live API endpoint. The system will process your data through Bronze → Silver → Gold layers automatically.",
  },
  {
    q: "How does customer-product matching work?",
    a: "The matching engine scores products for each customer based on their health profile (allergens, dietary goals, health conditions). Scores are calculated using tag overlap (60%), hard-limit penalties (40%), and recency (5%). Matches above the threshold appear in the Recommendations tab on each customer's profile.",
  },
  {
    q: "What is a quality score?",
    a: "Each product receives a quality score across 6 dimensions: data completeness, accuracy, nutrition data, image availability, allergen labelling, and taxonomy classification. Scores are recalculated after each ingestion run and shown as colored badges on the Products page.",
  },
  {
    q: "How do I configure compliance rules?",
    a: "Navigate to the Compliance page. You can create rules that flag products based on ingredients, allergen declarations, or regulatory codes. Rules run automatically during ingestion and results appear in the Compliance dashboard.",
  },
  {
    q: "What file formats are supported for import?",
    a: "CSV is the primary supported format. Columns are mapped during the import wizard's 'Map Fields' step. The system accepts UTF-8 encoded files with headers in the first row.",
  },
  {
    q: "Why are my dashboard metrics showing zero?",
    a: "Dashboard stats (Total Products, Active Customers, etc.) are populated once data has been ingested. Trigger an import from the Jobs page to start seeing live numbers.",
  },
  {
    q: "How do I invite team members?",
    a: "Go to Settings → Role Permissions. You can assign roles (Vendor Admin, Vendor Viewer) to control what each team member can access. Contact your system administrator to create new user accounts.",
  },
  {
    q: "How do I set up a webhook?",
    a: "Go to Settings → Integrations → Webhooks. Add your endpoint URL and select the events you want to receive (e.g. Product Match Found, Import Completed). The system sends HMAC-signed POST requests to your URL on each event.",
  },
]

export default function HelpPage() {
  const branding = useBrandingConfig()

  return (
    <AppShell>
      <div className="p-6 space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#1e293b]">Help Center</h1>
          <p className="text-sm text-[#64748b] mt-1">
            Documentation and support for the {branding.vendorName} Vendor Portal
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-base font-semibold text-[#1e293b] mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#00438f]" />
            Quick Links
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ label, description, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <Card className="hover:border-[#00438f] hover:shadow-sm transition-all cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 flex gap-3 items-start">
                    <div className="p-2 bg-[#eff6ff] rounded-lg shrink-0">
                      <Icon className="h-4 w-4 text-[#00438f]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#1e293b]">{label}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-base font-semibold text-[#1e293b] mb-3">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-1">
            {FAQS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-[#1e293b] hover:no-underline py-3">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#475569] pb-3">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Need More Help?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <a
              href="mailto:support@odysseyts.com"
              className="flex items-center gap-2 text-sm text-[#00438f] hover:underline"
            >
              <Mail className="h-4 w-4" />
              support@odysseyts.com
            </a>
            <a
              href="https://github.com/souravOD/nutri-b2b-backend/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#00438f] hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open a GitHub issue
            </a>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
