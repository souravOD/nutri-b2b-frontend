"use client"

import * as React from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"
import { trackEvent } from "@/lib/analytics"
import {
  Upload,
  Package,
  Users,
  ShieldCheck,
  ExternalLink,
  Mail,
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
  React.useEffect(() => { trackEvent("page_view", { page: "help" }) }, [])

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className="text-[#64748b]">
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Portal</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-[#0f172a]">Help</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f172a]">Help</h1>
          <p className="mt-1 text-base text-[#64748b]">
            Documentation and support for the {branding.vendorName} Vendor Portal.
          </p>
        </div>

        {/* Quick Links — 4-column, vertical card layout */}
        <div className="grid grid-cols-4 gap-4">
          {QUICK_LINKS.map(({ label, description, href, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full cursor-pointer border border-[#e2e8f0] hover:border-primary hover:shadow-md transition-all duration-150">
                <CardContent className="pt-6 pb-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[#1e293b] leading-snug">{label}</p>
                    <p className="text-sm text-[#64748b] mt-1">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <div>
          {/* Heading row with "View all articles" link */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#1e293b]">Frequently Asked Questions</h2>
            <Link
              href="/knowledge-base"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all articles
            </Link>
          </div>

          {/* Flat rows in single bordered container, alternating row backgrounds */}
          <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
            <Accordion type="single" collapsible>
              {FAQS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className={`px-5 border-b border-[#e2e8f0] last:border-b-0 ${
                    i % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                  }`}
                >
                  <AccordionTrigger className="text-sm font-medium text-[#1e293b] hover:no-underline py-5 min-h-[64px]">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-[#475569] pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Need More Help — full-width dark navy card */}
        <div className="rounded-xl bg-[#0C4A7F] px-10 py-10 flex items-center justify-between gap-8">
          <div className="min-w-0">
            <h2 className="text-[30px] font-bold text-white leading-tight">Need More Help?</h2>
            <p className="mt-2 text-sm text-[#b0d0ed] max-w-lg">
              Our support team and developer resources are available 24/7 to help you resolve any issues.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Button
              asChild
              variant="outline"
              className="bg-white text-[#0C4A7F] border-white hover:bg-[#eff6ff] hover:text-[#003366] justify-start"
            >
              <a href="mailto:support@odysseyts.com">
                <Mail className="h-4 w-4" />
                support@odysseyts.com
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white justify-start"
            >
              <a
                href="https://github.com/souravOD/nutri-b2b-backend/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open a GitHub issue
              </a>
            </Button>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
