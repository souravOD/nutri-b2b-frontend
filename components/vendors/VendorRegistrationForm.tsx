"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "AU", name: "Australia" },
  { code: "AE", name: "UAE" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
] as const;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

// E.164: + followed by 6-15 digits
const E164_RE = /^\+\d{6,15}$/;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Normalize phone: strip spaces/dashes, auto-prepend + if missing */
function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

// ── Component ────────────────────────────────────────────────────────────────

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
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const derivedSlug = React.useMemo(() => slugify(companyName), [companyName]);
  const derivedDomain = React.useMemo(() => deriveDomain(billingEmail), [billingEmail]);

  /** Client-side validation — returns true if all fields are valid */
  function validate(): boolean {
    const errors: Record<string, string> = {};

    const name = companyName.trim();
    if (name.length < 2 || name.length > 128) {
      errors.companyName = "Company name must be 2–128 characters.";
    }

    const email = billingEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.billingEmail = "Enter a valid email address.";
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && !E164_RE.test(normalizedPhone)) {
      errors.phone = "Phone must be in E.164 format, e.g. +15551234567 (6–15 digits after +).";
    }

    // country and timezone are now dropdowns, so they're always valid if selected

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const normalizedPhone = normalizePhone(phone);

      const res = await apiFetch("/admin/vendors/register", {
        method: "POST",
        body: JSON.stringify({
          companyName: companyName.trim(),
          billingEmail: billingEmail.trim().toLowerCase(),
          phone: normalizedPhone || null,
          country: country || null,
          timezone: timezone || null,
        }),
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        // Show the specific backend message instead of generic mapping
        const message = body?.message || body?.detail || "Vendor registration failed.";
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

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName">
          Name of company <span className="text-red-500">*</span>
        </Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, companyName: "" }));
          }}
          placeholder="Odyssey Tech Systems"
          required
          minLength={2}
          maxLength={128}
          aria-invalid={!!fieldErrors.companyName}
        />
        {fieldErrors.companyName && (
          <p className="text-xs text-red-600">{fieldErrors.companyName}</p>
        )}
      </div>

      {/* Billing Email */}
      <div className="space-y-2">
        <Label htmlFor="billingEmail">
          Billing email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="billingEmail"
          type="email"
          value={billingEmail}
          onChange={(e) => {
            setBillingEmail(e.target.value);
            setFieldErrors((prev) => ({ ...prev, billingEmail: "" }));
          }}
          placeholder="billing@company.com"
          required
          aria-invalid={!!fieldErrors.billingEmail}
        />
        <p className="text-xs text-muted-foreground">
          Used to derive the vendor domain for auto-matching users during onboarding
        </p>
        {fieldErrors.billingEmail && (
          <p className="text-xs text-red-600">{fieldErrors.billingEmail}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldErrors((prev) => ({ ...prev, phone: "" }));
            }}
            placeholder="+15551234567"
            aria-invalid={!!fieldErrors.phone}
          />
          <p className="text-xs text-muted-foreground">
            E.164 format (+ prefix auto-added)
          </p>
          {fieldErrors.phone && (
            <p className="text-xs text-red-600">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Country — Select dropdown */}
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone — Select dropdown */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Derived preview */}
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

      {/* Actions */}
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
