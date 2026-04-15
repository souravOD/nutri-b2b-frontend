"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Globe, ChevronRight, Building2, Activity, Shield, Plus } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function VendorsPage() {
  const router = useRouter();
  const [vendorSlug, setVendorSlug] = React.useState("");
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [loadingStats, setLoadingStats] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/vendors");
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        if (!res.ok || !alive) return;
        const data = (body as { data?: Vendor[] })?.data;
        setVendors(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingStats(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeTenants = vendors.filter((v) => v.status === "active").length;
  const displaySlug = vendorSlug.trim() ? normalizeSlug(vendorSlug) || "vendor" : "vendor";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = normalizeSlug(vendorSlug);
    if (!slug) return;
    router.push(`/${slug}/login`);
  };

  return (
    <AppShell title="Tenant Selector">
      <div className="container mx-auto p-10 space-y-8 bg-[#f8fafc] min-h-screen">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Breadcrumb>
              <BreadcrumbList className="text-[#64748b]">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-[#0f172a]">Tenant Selector</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.9px] leading-10">
              Tenant Selector
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="border-[#e2e8f0] text-[#0f172a]">
              <Link href="/vendors/manage">View all vendors</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-[#003366] text-white">
              <Link href="/vendors/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Register Vendor
              </Link>
            </Button>
          </div>
        </div>

        {/* Main card */}
        <div className="flex justify-center pt-4">
          <div
            className="w-full max-w-[576px] bg-white border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0px_8px_10px_-6px_rgba(0,0,0,0.1)]"
          >
            {/* Gradient header */}
            <div
              className="h-[192px] flex flex-col justify-end p-8"
              style={{
                background: "linear-gradient(129.649deg, var(--primary) 67.51%, #0066cc 95.218%)",
              }}
            >
              <h2 className="text-[24px] font-bold text-white leading-8">Select Tenant</h2>
              <p className="text-[14px] text-white/90 leading-5 mt-1">
                Access your organization&apos;s specific workspace
              </p>
            </div>

            {/* Form section */}
            <div className="p-8 space-y-6">
              <p className="text-[16px] text-[#475569] leading-6">
                Enter your vendor slug to access your branded login page
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="vendor-slug" className="text-[14px] font-semibold text-[#334155]">
                    Vendor Slug
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                    <Input
                      id="vendor-slug"
                      type="text"
                      placeholder="e.g., acme, foodcorp, healthyeats"
                      value={vendorSlug}
                      onChange={(e) => setVendorSlug(e.target.value)}
                      className="pl-12 h-12 bg-[#f8fafc] border-[#e2e8f0] rounded-[8px] text-[16px] placeholder:text-[#94a3b8]"
                    />
                  </div>
                  <p className="text-[14px] text-[#64748b] flex items-center gap-1">
                    <span>This will take you to</span>
                    <span className="font-mono text-primary">/{displaySlug}/login</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={!vendorSlug.trim()}
                  className="w-full h-12 bg-primary hover:bg-[#003366] text-white font-bold text-[16px] rounded-[8px] flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </form>

              {/* Secondary links */}
              <div className="border-t border-[#f1f5f9] pt-8">
                <p className="text-[14px] text-[#64748b] text-center">
                  Need help finding your slug?{" "}
                  <Link href="/help" className="font-semibold text-primary hover:underline">
                    Contact Support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards row */}
        <div className="flex flex-wrap justify-center gap-6 pt-6">
          <div className="flex items-center gap-4 p-[17px] rounded-[8px] border border-[#e2e8f0] bg-white min-w-[200px] flex-1 max-w-[283px]">
            <div className="h-10 w-10 rounded-lg bg-[rgba(0,67,143,0.1)] flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] leading-4">
                Active Tenants
              </p>
              <p className="text-[20px] font-bold text-[#0f172a] leading-7 mt-0.5">
                {loadingStats ? "—" : activeTenants.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-[17px] rounded-[8px] border border-[#e2e8f0] bg-white min-w-[200px] flex-1 max-w-[283px]">
            <div className="h-9 w-8 flex items-center justify-center shrink-0">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] leading-4">
                System Status
              </p>
              <p className="text-[20px] font-bold text-[#0f172a] leading-7 mt-0.5">Optimal</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-[17px] rounded-[8px] border border-[#e2e8f0] bg-white min-w-[200px] flex-1 max-w-[283px]">
            <div className="h-9 w-8 flex items-center justify-center shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-[0.6px] leading-4">
                SSO Enabled
              </p>
              <p className="text-[20px] font-bold text-[#0f172a] leading-7 mt-0.5">Secure</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
