"use client";

import * as React from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Vendor = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  teamId?: string | null;
  team_id?: string | null;
  billingEmail?: string | null;
  billing_email?: string | null;
  createdAt?: string;
  created_at?: string;
};

export default function VendorsManagePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/vendors");
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        if (!res.ok) {
          throw new Error(
            (body as { detail?: string; message?: string })?.detail ||
              (body as { detail?: string; message?: string })?.message ||
              "Failed to load vendors."
          );
        }
        if (!alive) return;
        setVendors(Array.isArray((body as { data?: Vendor[] })?.data) ? (body as { data: Vendor[] }).data : []);
      } catch (err: unknown) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load vendors.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell title="Manage Vendors">
      <div className="container mx-auto p-10 space-y-8 bg-[#f8fafc] min-h-screen">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Breadcrumb>
              <BreadcrumbList className="text-[#64748b]">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Portal</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/vendors">Tenant Selector</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-[#0f172a]">Manage Vendors</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Manage Vendors</h1>
            <p className="text-sm text-[#64748b]">Manage vendor identities and workspace teams.</p>
          </div>
          <Button asChild>
            <Link href="/vendors/new">Register Vendor</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-[#64748b]">Loading vendors...</div>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : (
          <div className="rounded-md border border-[#e2e8f0] overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Team ID</th>
                  <th className="text-left p-3">Billing Email</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[#64748b]" colSpan={5}>
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="border-t border-[#e2e8f0]">
                      <td className="p-3">{v.name}</td>
                      <td className="p-3">{v.slug || "-"}</td>
                      <td className="p-3">{v.status || "-"}</td>
                      <td className="p-3">{v.teamId || v.team_id || "-"}</td>
                      <td className="p-3">{v.billingEmail || v.billing_email || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
