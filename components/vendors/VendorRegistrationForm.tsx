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

const COUNTRY_CODES = [
  { code: "+1", label: "+1 (US)" },
  { code: "+44", label: "+44 (UK)" },
  { code: "+91", label: "+91 (IN)" },
  { code: "+61", label: "+61 (AU)" },
  { code: "+81", label: "+81 (JP)" },
  { code: "+86", label: "+86 (CN)" },
  { code: "+49", label: "+49 (DE)" },
  { code: "+33", label: "+33 (FR)" },
  { code: "+55", label: "+55 (BR)" },
  { code: "+52", label: "+52 (MX)" },
  { code: "+65", label: "+65 (SG)" },
  { code: "+971", label: "+971 (AE)" },
  { code: "+64", label: "+64 (NZ)" },
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

/** Build E.164 from country code + local number */
function buildE164(countryCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  if (!digits) return "";
  const code = countryCode.startsWith("+") ? countryCode : "+" + countryCode;
  return code + digits;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VendorRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [companyName, setCompanyName] = React.useState("");
  const [billingEmail, setBillingEmail] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+1");
  const [phoneNumber, setPhoneNumber] = React.useState("");
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

    const normalizedPhone = buildE164(countryCode, phoneNumber);
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
      const normalizedPhone = buildE164(countryCode, phoneNumber);

      const res = await apiFetch("/admin/vendors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      router.push("/vendors/manage");
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

  const labelClass = "font-semibold text-[#334155] text-sm";
  const inputClass = "border-[#e2e8f0] rounded-lg py-[15px] px-[17px]";

  return (
    <div className="w-full space-y-6">
      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Info card (745-4935): two-column layout - image left, text right per Figma */}
      <div className="flex overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        {/* Left panel (~320px): gradient + image with mix-blend-overlay (745-4941) */}
        <div className="relative min-h-[132px] min-w-[280px] w-[319px] shrink-0 overflow-hidden">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(157.491deg, rgba(0, 67, 143, 0.2) 0%, rgba(0, 67, 143, 0.4) 100%)",
            }}
          />
          <div className="absolute inset-0 mix-blend-overlay">
            <img
              src="/assets/register-vendor-bg.png"
              alt=""
              className="h-full w-full object-cover"
              onLoad={(e) => (e.currentTarget.style.opacity = "1")}
              onError={(e) => (e.currentTarget.style.display = "none")}
              style={{ opacity: 0 }}
            />
          </div>
        </div>
        {/* Right panel: Register Vendor text (745-4942) */}
        <div className="flex flex-1 flex-col gap-2 p-6">
          <h2 className="text-xl font-bold text-[#0f172a]">Register Vendor</h2>
          <p className="text-base leading-6 text-[#475569]">
            Superadmin only. This creates the vendor in{" "}
            <span className="font-medium text-primary">Appwrite</span>
            {" "}and{" "}
            <span className="font-medium text-primary">Supabase</span>
            . Ensure all details are accurate as slug and domain are automatically derived.
          </p>
        </div>
      </div>

      {/* Form card (745-4947) - full width like Figma */}
      <div className="w-full rounded-xl border border-[#e2e8f0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] pt-[41px] pb-[49px] px-[33px]">
        <form onSubmit={onSubmit} className="flex flex-col gap-8">
          {/* Row 1: Company Name | Billing Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName" className={labelClass}>
                Name of company (Required)
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, companyName: "" }));
                }}
                placeholder="e.g. Acme Corp"
                required
                minLength={2}
                maxLength={128}
                aria-invalid={!!fieldErrors.companyName}
                className={inputClass}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-red-600">{fieldErrors.companyName}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="billingEmail" className={labelClass}>
                Billing email (Required)
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
                className={inputClass}
              />
              {fieldErrors.billingEmail && (
                <p className="text-xs text-red-600">{fieldErrors.billingEmail}</p>
              )}
            </div>
          </div>

          {/* Row 2: Phone | Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumber" className={labelClass}>
                Phone
              </Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={(v) => { setCountryCode(v); setFieldErrors((prev) => ({ ...prev, phone: "" })); }}>
                  <SelectTrigger id="countryCode" className={`w-[112px] h-[50px] ${inputClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  placeholder="555-0123"
                  aria-invalid={!!fieldErrors.phone}
                  className={`flex-1 h-[50px] ${inputClass}`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="country" className={labelClass}>
                Country
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country" className={`h-[50px] ${inputClass}`}>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Timezone full-width */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone" className={labelClass}>
              Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className={`h-[50px] ${inputClass}`}>
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

          {/* Derived Details (745-4947) */}
          <div className="border-t border-[#f1f5f9] pt-[25px] flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#0f172a]">Derived Details</h3>
            <div className="bg-[#f8fafc] rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-[#64748b] tracking-[0.6px] font-semibold">
                  Derived Slug
                </span>
                <span className={`text-sm ${derivedSlug ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
                  {derivedSlug || "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase text-[#64748b] tracking-[0.6px] font-semibold">
                  Derived Domain
                </span>
                <span className={`text-sm ${derivedDomain ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
                  {derivedDomain || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/vendors/manage")}
              disabled={submitting}
              className="rounded-lg border-[#e2e8f0]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-[#003a7a] rounded-lg"
            >
              {submitting ? "Registering..." : "Register vendor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
