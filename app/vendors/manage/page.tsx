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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MoreVertical, ChevronLeft, ChevronRight, Plus } from "lucide-react";

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

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#dcfce7] text-[#15803d]">
        Active
      </span>
    );
  }
  if (s === "suspended") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status || "Inactive"}
    </span>
  );
}

export default function VendorsManagePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [page, setPage] = React.useState(0);

  const refreshVendors = React.useCallback(async () => {
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
      setVendors(Array.isArray((body as { data?: Vendor[] })?.data) ? (body as { data: Vendor[] }).data : []);
      setPage(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshVendors();
  }, [refreshVendors]);

  const handleSuspend = async (v: Vendor) => {
    if (!confirm(`Suspend vendor "${v.name}"? They will no longer be able to access their workspace.`)) return;
    try {
      const res = await apiFetch(`/api/vendors/${v.id}/suspend`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Failed to suspend vendor");
      }
      await refreshVendors();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to suspend vendor");
    }
  };

  const paginated = React.useMemo(() => {
    const start = page * PAGE_SIZE;
    return vendors.slice(start, start + PAGE_SIZE);
  }, [vendors, page]);

  const totalPages = Math.max(1, Math.ceil(vendors.length / PAGE_SIZE));
  const startIdx = page * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, vendors.length);

  return (
    <AppShell title="Vendor Management">
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
                  <BreadcrumbPage className="font-medium text-[#0f172a]">Vendors</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Vendor Management</h1>
            <p className="text-sm text-[#64748b]">Manage vendor identities and workspace teams.</p>
          </div>
          <Button asChild className="bg-[#00438f] hover:bg-[#003366] text-white rounded-lg h-10">
            <Link href="/vendors/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register Vendor
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-[#64748b]">Loading vendors...</div>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : (
          <div className="rounded-[12px] border border-[#e2e8f0] overflow-hidden bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Slug</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Team ID</th>
                  <th className="text-left p-3 font-medium">Billing Email</th>
                  <th className="text-left p-3 font-medium w-12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[#64748b]" colSpan={6}>
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((v) => (
                    <tr key={v.id} className="border-t border-[#e2e8f0]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e0f2fe]">
                            <Building2 className="h-4 w-4 text-[#0284c7]" />
                          </div>
                          <Link href={`/vendors/${v.id}`} className="font-medium text-[#0f172a] hover:underline">
                            {v.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3 text-[#64748b]">{v.slug || "-"}</td>
                      <td className="p-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="p-3 text-[#64748b]">{v.teamId || v.team_id || "-"}</td>
                      <td className="p-3 text-[#64748b]">{v.billingEmail || v.billing_email || "-"}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/vendors/${v.id}`}>Details</Link>
                            </DropdownMenuItem>
                            {(v.status || "").toLowerCase() === "active" && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleSuspend(v)}
                              >
                                Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {vendors.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#e2e8f0] px-4 py-3 text-sm text-[#64748b]">
                <span>
                  Showing {startIdx + 1} to {endIdx} of {vendors.length} vendors
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
