"use client";

import * as React from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

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

export default function VendorsPage() {
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
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          throw new Error(body?.detail || body?.message || "Failed to load vendors.");
        }
        if (!alive) return;
        setVendors(Array.isArray(body?.data) ? body.data : []);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Failed to load vendors.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppShell title="Vendors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage vendor identities and workspace teams.</p>
        </div>
        <Button asChild>
          <Link href="/vendors/new">Register Vendor</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading vendors...</div>
      ) : error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
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
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="border-t">
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
    </AppShell>
  );
}
