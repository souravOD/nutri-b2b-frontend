"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import AppShell from "@/components/app-shell"
import { apiFetch } from "@/lib/backend"
import { ChevronRight, Globe, Phone, Save, XCircle } from "lucide-react"

// Curated country list for dropdown
const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
]

const DEFAULT_TZ = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
]

function formatTimezoneWithOffset(tz: string): string {
  try {
    const date = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(date)
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? ""
    return `${tz} (${tzName})`
  } catch {
    return tz
  }
}

interface ProfileData {
  id: string
  appwriteUserId: string
  email: string
  displayName: string
  phone: string | null
  country: string | null
  timezone: string | null
  vendorId: string | null
  role: string
  vendorName?: string | null
  vendorSlug?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [email, setEmail] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [timezone, setTimezone] = React.useState("")
  const [role, setRole] = React.useState("")
  const [vendorName, setVendorName] = React.useState("")
  const [vendorSlug, setVendorSlug] = React.useState("")

  const timezones = React.useMemo(() => {
    try {
      // @ts-ignore: TS doesn't yet know supportedValuesOf in older libs
      const tz = Intl.supportedValuesOf?.("timeZone")
      return Array.isArray(tz) && tz.length ? tz : DEFAULT_TZ
    } catch {
      return DEFAULT_TZ
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiFetch("/api/profile")
        if (res.status === 401) {
          if (!cancelled) setLoading(false)
          router.replace("/login")
          return
        }
        if (!res.ok) throw new Error("Failed to load profile")
        const data: ProfileData = await res.json()
        if (cancelled) return

        setEmail(data.email || "")
        setDisplayName(data.displayName || "")
        setPhone(data.phone || "")
        setCountry(data.country || "")
        setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
        setRole(data.role || "")
        setVendorName(data.vendorName || "")
        setVendorSlug(data.vendorSlug || "")
      } catch (err: any) {
        toast({ title: "Couldn't load profile", description: err?.message, variant: "destructive" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      toast({ title: "Display name is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: displayName.trim(),
          phone: phone.trim() || null,
          country: country || null,
          timezone: timezone.trim() || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to save profile")
      }
      toast({ title: "Profile updated" })
    } catch (err: any) {
      toast({
        title: "Couldn't save profile",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function handleRequestDeletion() {
    toast({
      title: "Account deletion",
      description: "Contact your administrator to request account deletion.",
      variant: "destructive",
    })
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="container mx-auto max-w-3xl p-10 space-y-8 bg-[#f8fafc] min-h-screen">
          <div className="h-4 w-48 rounded bg-[#e2e8f0] animate-pulse" />
          <div className="h-32 rounded-xl bg-white border border-[#e2e8f0] animate-pulse" />
          <div className="h-48 rounded-xl bg-white border border-[#e2e8f0] animate-pulse" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Profile">
      <div className="container mx-auto max-w-3xl p-10 space-y-8 bg-[#f8fafc] min-h-screen">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-[#64748b] hover:text-[#0f172a]">
            Portal
          </Link>
          <ChevronRight className="h-4 w-4 text-[#64748b]" />
          <span className="font-medium text-[#0f172a]">Profile</span>
        </nav>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.75px]">
            User Profile
          </h1>
          <p className="text-[16px] text-[#64748b]">
            Manage your account information and preferences.
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#e2e8f0] px-[24px] py-6">
              <h2 className="text-[18px] font-bold text-[#0f172a]">Personal Information</h2>
              <p className="text-[14px] text-[#64748b] mt-1">
                Your public identity and contact details.
              </p>
            </div>
            <div className="p-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[14px] font-semibold text-[#334155]">
                  Full Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="h-[42px] rounded-[8px] border-[#e2e8f0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[14px] font-semibold text-[#334155]">
                  Work Email
                </Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="h-[42px] rounded-[8px] border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]"
                />
                <p className="text-[10px] text-[#94a3b8]">
                  Email cannot be changed manually. Contact admin.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[14px] font-semibold text-[#334155]">
                  Phone Number (Optional)
                </Label>
                <div className="flex">
                  <div className="flex h-[42px] items-center rounded-l-[8px] border border-r-0 border-[#e2e8f0] bg-[#f8fafc] px-3">
                    <Phone className="h-4 w-4 text-[#64748b]" />
                  </div>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+15551234567"
                    className="h-[42px] rounded-r-[8px] rounded-l-none border-[#e2e8f0]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-[14px] font-semibold text-[#334155]">
                  Country ISO-2
                </Label>
                <Select
                  value={country || "__none__"}
                  onValueChange={(v) => setCountry(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger
                    id="country"
                    className="h-[42px] w-full rounded-[8px] border-[#e2e8f0]"
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Workplace Details */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#e2e8f0] px-[24px] py-6">
              <h2 className="text-[18px] font-bold text-[#0f172a]">Workplace Details</h2>
              <p className="text-[14px] text-[#64748b] mt-1">
                Settings related to your company and workspace identification.
              </p>
            </div>
            <div className="p-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[14px] font-semibold text-[#334155]">
                  Company Name
                </Label>
                <Input
                  value={vendorName}
                  disabled
                  className="h-[42px] rounded-[8px] border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]"
                  placeholder="—"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[14px] font-semibold text-[#334155]">
                  Workspace Slug
                </Label>
                <div className="flex">
                  <div className="flex h-[42px] items-center rounded-l-[8px] border border-r-0 border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#94a3b8]">
                    {typeof window !== "undefined" ? `${window.location.origin}/` : "app.sam.com/"}
                  </div>
                  <Input
                    value={vendorSlug}
                    disabled
                    className="h-[42px] rounded-r-[8px] rounded-l-none border-[#e2e8f0] bg-[#f8fafc]"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#e2e8f0] px-[24px] py-6 flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#0f172a]">Localization</h2>
                <p className="text-[14px] text-[#64748b] mt-1">
                  Configure your regional time and date settings.
                </p>
              </div>
              <Globe className="h-5 w-5 text-[#64748b] shrink-0" />
            </div>
            <div className="p-6 space-y-2">
              <Label htmlFor="timezone" className="text-[14px] font-semibold text-[#334155]">
                Timezone (IANA)
              </Label>
              <Select value={timezone || undefined} onValueChange={setTimezone}>
                <SelectTrigger
                  id="timezone"
                  className="h-[42px] w-full max-w-md rounded-[8px] border-[#e2e8f0]"
                >
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.slice(0, 200).map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {formatTimezoneWithOffset(tz)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] text-[#94a3b8]">
                Determines how logs and reports are timestamped.
              </p>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-[#e2e8f0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.refresh()}
              disabled={saving}
              className="border-[#cbd5e1]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#00438f] hover:bg-[#003366] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {/* Account Deletion Danger Zone */}
          <div className="bg-[rgba(254,242,242,0.2)] border-2 border-[#fee2e2] border-dashed rounded-[12px] p-6">
            <div className="flex gap-4 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#fee2e2]">
                <XCircle className="h-5 w-5 text-[#b91c1c]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-[16px] font-bold text-[#b91c1c]">Account Deletion</h3>
                <p className="text-[14px] text-[rgba(220,38,38,0.8)]">
                  Deleting your account is permanent and cannot be undone. All workspace access will
                  be revoked.
                </p>
                <button
                  type="button"
                  onClick={handleRequestDeletion}
                  className="text-[14px] font-bold text-[#dc2626] hover:underline mt-2"
                >
                  Request account deletion →
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
