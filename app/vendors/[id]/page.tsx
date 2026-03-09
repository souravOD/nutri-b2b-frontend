"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VendorDetailContent } from "./VendorDetailContent";

type VendorStats = {
  vendor: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    vendorType: string | null;
    country: string | null;
    industry: string | null;
    contactEmail: string | null;
    billingEmail: string | null;
    teamId: string | null;
    domains: string[] | null;
    apiEndpoint: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  stats: {
    productCount: number;
    userCount: number;
    customerCount: number;
    lastIngestion: string | null;
  };
};

export default function VendorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [errorState, setErrorState] = React.useState<"404" | "403" | "network" | null>(null);
  const [data, setData] = React.useState<VendorStats | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editContactEmail, setEditContactEmail] = React.useState("");
  const [editBillingEmail, setEditBillingEmail] = React.useState("");
  const [editDomains, setEditDomains] = React.useState("");
  const [editApiEndpoint, setEditApiEndpoint] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorState(null);
    setData(null);
    try {
      const res = await apiFetch(`/api/vendors/${id}/stats`);
      const body = await res.json().catch(() => ({} as Record<string, unknown>));

      if (res.status === 404) {
        setErrorState("404");
        return;
      }
      if (res.status === 403) {
        setErrorState("403");
        return;
      }
      if (!res.ok) {
        setErrorState("network");
        return;
      }

      setData(body as VendorStats);
    } catch {
      setErrorState("network");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEdit = () => {
    if (!data) return;
    const v = data.vendor;
    setEditName(v.name);
    setEditContactEmail(v.contactEmail ?? "");
    setEditBillingEmail(v.billingEmail ?? "");
    setEditDomains(Array.isArray(v.domains) ? v.domains.join(", ") : "");
    setEditApiEndpoint(v.apiEndpoint ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      const domains = editDomains
        .split(/[,\s]+/)
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await apiFetch(`/api/vendors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          contactEmail: editContactEmail.trim() || null,
          billingEmail: editBillingEmail.trim() || null,
          domains,
          apiEndpoint: editApiEndpoint.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Update failed");
      }

      toast({ title: "Vendor updated" });
      setEditOpen(false);
      fetchData();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!data || !confirm(`Suspend vendor "${data.vendor.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/vendors/${id}/suspend`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Suspend failed");
      }
      toast({ title: "Vendor suspended" });
      fetchData();
    } catch (err) {
      toast({
        title: "Suspend failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async () => {
    if (!data || !confirm(`Reactivate vendor "${data.vendor.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/vendors/${id}/reactivate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || "Reactivate failed");
      }
      toast({ title: "Vendor reactivated" });
      fetchData();
    } catch (err) {
      toast({
        title: "Reactivate failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // 404
  if (!loading && errorState === "404") {
    return (
      <AppShell title="Vendor Not Found">
        <div className="-mx-4 md:-mx-6 -mt-4 bg-[#f8fafc] min-h-screen pt-4 p-10 md:p-[40px]">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h1 className="text-xl font-semibold text-[#0f172a]">Vendor not found</h1>
            <p className="text-[#64748b] mt-2">The vendor you're looking for doesn't exist or has been removed.</p>
            <Button asChild className="mt-4">
              <Link href="/vendors/manage">Back to Manage Vendors</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // 403
  if (!loading && errorState === "403") {
    return (
      <AppShell title="Access Denied">
        <div className="-mx-4 md:-mx-6 -mt-4 bg-[#f8fafc] min-h-screen pt-4 p-10 md:p-[40px]">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldOff className="h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-semibold text-[#0f172a]">Access denied</h1>
            <p className="text-[#64748b] mt-2">You don't have permission to view this vendor.</p>
            <Button asChild className="mt-4">
              <Link href="/vendors/manage">Back to Manage Vendors</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Network/other error
  if (!loading && errorState) {
    return (
      <AppShell title="Error">
        <div className="-mx-4 md:-mx-6 -mt-4 bg-[#f8fafc] min-h-screen pt-4 p-10 md:p-[40px]">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h1 className="text-xl font-semibold text-[#0f172a]">Something went wrong</h1>
            <p className="text-[#64748b] mt-2">Unable to load vendor details. Please try again.</p>
            <Button onClick={fetchData} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Loading skeleton
  if (loading || !data) {
    return (
      <AppShell title="Vendor">
        <div className="-mx-4 md:-mx-6 -mt-4 bg-[#f8fafc] min-h-screen pt-4">
          <div className="flex flex-col gap-[32px] p-10 md:p-[40px]">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const { vendor, stats } = data;
  const firstLetter = (vendor.name || "?").charAt(0).toUpperCase();
  const isSuspended = (vendor.status || "").toLowerCase() === "suspended";

  const pageTitle = vendor.name;
  return (
    <AppShell title={pageTitle}>
      <VendorDetailContent
        vendor={vendor}
        stats={stats}
        id={id}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editName={editName}
        setEditName={setEditName}
        editContactEmail={editContactEmail}
        setEditContactEmail={setEditContactEmail}
        editBillingEmail={editBillingEmail}
        setEditBillingEmail={setEditBillingEmail}
        editDomains={editDomains}
        setEditDomains={setEditDomains}
        editApiEndpoint={editApiEndpoint}
        setEditApiEndpoint={setEditApiEndpoint}
        editSaving={editSaving}
        openEdit={openEdit}
        saveEdit={saveEdit}
        handleSuspend={handleSuspend}
        handleReactivate={handleReactivate}
      />
    </AppShell>
  );
}
