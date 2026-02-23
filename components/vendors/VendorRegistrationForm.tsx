"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function deriveDomain(email: string): string {
  const normalized = String(email || "").trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at < 0) return "";
  return normalized.slice(at + 1);
}

function mapErrorCode(code: string, fallback: string): string {
  if (code === "invalid_input") return "Please check company details and try again.";
  if (code === "invalid_token") return "Your session expired. Please log in again.";
  if (code === "forbidden") return "Only superadmin can register vendors.";
  if (code === "appwrite_team_create_failed") return "Could not create Appwrite team.";
  if (code === "appwrite_membership_create_failed") return "Could not add creator as team admin.";
  if (code === "appwrite_vendor_create_failed") return "Could not create Appwrite vendor document.";
  if (code === "supabase_insert_failed_rolled_back") return "Supabase insert failed. Appwrite changes were rolled back.";
  return fallback || "Vendor registration failed.";
}

export default function VendorRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [companyName, setCompanyName] = React.useState("");
  const [billingEmail, setBillingEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const derivedSlug = React.useMemo(() => slugify(companyName), [companyName]);
  const derivedDomain = React.useMemo(() => deriveDomain(billingEmail), [billingEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/admin/vendors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          billingEmail: billingEmail.trim().toLowerCase(),
          phone: phone.trim() || null,
          country: country.trim().toUpperCase() || null,
          timezone: timezone.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const code = String(body?.code || "");
        const message = mapErrorCode(code, String(body?.message || ""));
        setError(message);
        toast({
          title: "Vendor registration failed",
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vendor registered",
        description: `${body?.vendor?.name || "Vendor"} created successfully.`,
      });
      router.push("/vendors");
    } catch (err: any) {
      const message = err?.message || "Unable to reach backend.";
      setError(message);
      toast({
        title: "Vendor registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="companyName">Name of company</Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Odyssey Tech Systems"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingEmail">Billing email</Label>
        <Input
          id="billingEmail"
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          placeholder="billing@company.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+15551234567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="US"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/New_York"
          />
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
        <div>
          <span className="font-medium">Derived slug:</span>{" "}
          <code>{derivedSlug || "-"}</code>
        </div>
        <div>
          <span className="font-medium">Derived domain:</span>{" "}
          <code>{derivedDomain || "-"}</code>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Registering..." : "Register vendor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/vendors")} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
