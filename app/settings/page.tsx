/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AlertTriangle, BarChart3, Copy, Database, Download, Globe, Heart, HelpCircle, Info, Loader2, Megaphone, Palette, Plus, RefreshCw, Shield, ShieldAlert, Trash2, User, Zap } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/backend"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeDomain = (val: string) =>
  val.replace(/^https?:\/\//i, "").replace(/\/$/, "").trim()

// ── Settings key constants ──────────────────────────────────────────────────
const SETTINGS_KEYS = {
  orgName: "org.name",
  orgDomain: "org.domain",
  orgTimezone: "org.timezone",
  autoMatching: "pref.auto_matching",
  emailNotifications: "pref.email_notifications",
  dataRetention: "pref.data_retention",
  autoBackups: "pref.auto_backups",
  cloudStorage: "pref.cloud_storage",
  require2fa: "pref.require_2fa",
  sessionTimeoutEnabled: "pref.session_timeout_enabled",
  sessionTimeoutMinutes: "pref.session_timeout_minutes",
  ipRestrictions: "pref.ip_restrictions",
  auditLogging: "pref.audit_logging",
  brandingLogoUrl: "branding.logo_url",
  brandingFaviconUrl: "branding.favicon_url",
  brandingPrimaryColor: "branding.primary_color",
  brandingSecondaryColor: "branding.secondary_color",
  brandingAccentColor: "branding.accent_color",
  brandingCopyright: "branding.copyright",
  brandingWelcomeMessage: "branding.welcome_message",
  brandingFontUrl: "branding.font_url",
  crmProvider: "crm.provider",
  crmAccessToken: "crm.access_token",
  crmApiKey: "crm.api_key",
  crmInstanceUrl: "crm.instance_url",
  integrationUsdaKey: "integration.usda.api_key",
  integrationNutritionLabelKey: "integration.nutrition_label.api_key",
  integrationComplianceKey: "integration.compliance_checker.api_key",
  integrationGa4Id: "integration.ga4_measurement_id",
  integrationMixpanelToken: "integration.mixpanel_token",
  accessRevocationGraceDays: "access_revocation_grace_days",
  emailTemplateOnboarding: "email_template.onboarding",
  emailTemplateReengagement: "email_template.reengagement",
  passwordMinLength:      "security.password_min_length",
  passwordRequireUpper:   "security.password_require_uppercase",
  passwordRequireNumber:  "security.password_require_number",
  passwordRequireSpecial: "security.password_require_special",
  lockoutMaxAttempts:     "security.lockout_max_attempts",
  lockoutDurationMinutes: "security.lockout_duration_minutes",
} as const

// ── Role Permissions config (Figma design) ───────────────────────────────────
type RoleKey = "superadmin" | "vendor_admin" | "vendor_operator" | "vendor_viewer" | "wellness_manager" | "marketing_manager"
const ROLE_CONFIG: {
  key: RoleKey
  label: string
  icon: "shield" | "user" | "heart" | "megaphone"
  permissions: { label: string; permKey: string }[]
}[] = [
  {
    key: "superadmin",
    label: "Super Administrator",
    icon: "shield",
    permissions: [
      { label: "Full system access", permKey: "*" },
      { label: "User management", permKey: "manage:users" },
      { label: "System settings", permKey: "manage:settings" },
      { label: "Data export", permKey: "read:audit" },
    ],
  },
  {
    key: "vendor_admin",
    label: "Administrator",
    icon: "shield",
    permissions: [
      { label: "Manage users", permKey: "manage:users" },
      { label: "Manage settings", permKey: "manage:settings" },
      { label: "Read / write products", permKey: "write:products" },
      { label: "Data export", permKey: "read:audit" },
    ],
  },
  {
    key: "vendor_operator",
    label: "Operator",
    icon: "shield",
    permissions: [
      { label: "Read / write products", permKey: "write:products" },
      { label: "Read / write customers", permKey: "write:customers" },
      { label: "Product ingest", permKey: "write:ingest" },
      { label: "Run ingestion", permKey: "read:ingest" },
      { label: "View matches", permKey: "read:matches" },
    ],
  },
  {
    key: "wellness_manager",
    label: "Wellness Manager",
    icon: "heart",
    permissions: [
      { label: "View customers", permKey: "read:customers" },
      { label: "View products", permKey: "read:products" },
      { label: "View matches", permKey: "read:matches" },
      { label: "View audit log", permKey: "read:audit" },
    ],
  },
  {
    key: "marketing_manager",
    label: "Marketing Manager",
    icon: "megaphone",
    permissions: [
      { label: "View customers", permKey: "read:customers" },
      { label: "View products", permKey: "read:products" },
      { label: "View vendor profile", permKey: "read:vendors" },
      { label: "Edit vendor profile", permKey: "write:vendors" },
      { label: "View audit log", permKey: "read:audit" },
    ],
  },
  {
    key: "vendor_viewer",
    label: "Viewer",
    icon: "user",
    permissions: [
      { label: "View products", permKey: "read:products" },
      { label: "View customers", permKey: "read:customers" },
      { label: "Edit products", permKey: "write:products" },
      { label: "Data export", permKey: "read:audit" },
    ],
  },
]

// ── Partner Theme Studio ─────────────────────────────────────────────────────
function AdminPortalPreview({ color, logoUrl }: { color: string; logoUrl: string }) {
  const safeColor = /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : "#2073BD"
  return (
    <div className="rounded-[10px] border border-[#e2e8f0] shadow-md overflow-hidden bg-white">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f1f5f9] border-b border-[#e2e8f0]">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      {/* Mini portal */}
      <div className="flex h-[180px]">
        {/* Sidebar */}
        <div className="w-[64px] shrink-0 flex flex-col items-center py-3 gap-3" style={{ backgroundColor: safeColor }}>
          <div className="size-8 rounded bg-white/20 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            ) : (
              <div className="size-4 rounded-sm bg-white/40" />
            )}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-9 h-1.5 rounded-full ${i === 0 ? "bg-white/80" : "bg-white/25"}`} />
          ))}
        </div>
        {/* Content area */}
        <div className="flex-1 bg-[#f8fafc] p-3 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="h-2 w-14 rounded bg-[#e2e8f0]" />
            <div className="size-4 rounded-full bg-[#e2e8f0]" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded p-1.5 border border-[#e2e8f0]">
                <div className="h-1.5 w-7 rounded bg-[#e2e8f0] mb-1" />
                <div className="h-2.5 w-5 rounded" style={{ backgroundColor: safeColor + "33" }} />
              </div>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-2.5 rounded bg-white border border-[#e2e8f0]" />
          ))}
          <div className="flex justify-end pt-1">
            <div className="h-4 w-10 rounded" style={{ backgroundColor: safeColor }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MemberAppPreview({ color, logoUrl }: { color: string; logoUrl: string }) {
  const safeColor = /^#[0-9a-fA-F]{3,6}$/.test(color) ? color : "#2073BD"
  return (
    <div className="rounded-[18px] border-2 border-[#1e293b] shadow-lg overflow-hidden bg-white w-[140px] mx-auto" style={{ height: 220 }}>
      {/* Phone notch */}
      <div className="h-4 flex justify-center items-end pb-1 bg-[#1e293b]">
        <div className="h-1.5 w-10 rounded-full bg-[#374151]" />
      </div>
      {/* App header */}
      <div className="px-2 py-1.5 flex items-center justify-between" style={{ backgroundColor: safeColor }}>
        <div className="flex items-center gap-1">
          <div className="size-4 rounded bg-white/25 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            ) : (
              <div className="size-2 rounded-sm bg-white/60" />
            )}
          </div>
          <div className="h-1.5 w-10 rounded bg-white/60" />
        </div>
        <div className="size-3 rounded-full bg-white/30" />
      </div>
      {/* Greeting */}
      <div className="px-2 pt-1.5 pb-1">
        <div className="h-1.5 w-16 rounded bg-[#1e293b]/70 mb-0.5" />
        <div className="h-1 w-10 rounded bg-[#94a3b8]" />
      </div>
      {/* Today's Goals card */}
      <div className="mx-2 mb-1.5 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-1.5 space-y-1">
        <div className="h-1 w-12 rounded bg-[#94a3b8]" />
        {[75, 50, 85].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-1 w-6 rounded bg-[#e2e8f0]">
              <div className="h-full rounded" style={{ width: `${w}%`, backgroundColor: safeColor }} />
            </div>
            <div className="h-1 w-4 rounded bg-[#e2e8f0]" />
          </div>
        ))}
      </div>
      {/* Recommended section */}
      <div className="mx-2">
        <div className="h-1 w-14 rounded bg-[#94a3b8] mb-1" />
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-1 rounded border border-[#e2e8f0] bg-white p-1">
              <div className="h-4 rounded mb-0.5" style={{ backgroundColor: safeColor + "22" }} />
              <div className="h-1 w-full rounded bg-[#e2e8f0]" />
            </div>
          ))}
        </div>
      </div>
      {/* Bottom nav */}
      <div className="absolute-bottom flex justify-around mt-2 px-2 pt-1 border-t border-[#f1f5f9]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`size-3 rounded ${i === 0 ? "opacity-100" : "opacity-30"}`} style={{ backgroundColor: safeColor }} />
        ))}
      </div>
    </div>
  )
}

function BrandingLivePreview({ color, logoUrl }: { color: string; logoUrl: string }) {
  const [mode, setMode] = React.useState<"admin" | "member">("admin")
  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden text-[11px] font-semibold w-fit">
        {(["admin", "member"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 transition-colors ${mode === m ? "bg-primary text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]"}`}
          >
            {m === "admin" ? "Admin Portal" : "Member App"}
          </button>
        ))}
      </div>
      {/* Preview */}
      {mode === "admin"
        ? <AdminPortalPreview color={color} logoUrl={logoUrl} />
        : <MemberAppPreview color={color} logoUrl={logoUrl} />
      }
      <p className="text-[11px] text-[#94a3b8] text-center">
        {mode === "admin" ? "Partner admin portal preview" : "Member-facing app preview"}
      </p>
    </div>
  )
}

// ── Session Stats Card (reads localStorage session history) ──────────────────
function SessionStatsCard() {
  const [stats, setStats] = React.useState<{ avgMs: number | null; lastMs: number | null }>({ avgMs: null, lastMs: null })

  React.useEffect(() => {
    // Lazy import so SSR doesn't blow up
    import("@/hooks/useSessionTimeout").then(({ getSessionStats }) => {
      setStats(getSessionStats())
    }).catch(() => {})
  }, [])

  function fmtMs(ms: number | null) {
    if (ms === null) return "—"
    const min = Math.floor(ms / 60_000)
    if (min < 1) return "<1 min"
    return `${min} min`
  }

  const emptyStats = stats.avgMs === null && stats.lastMs === null

  return (
    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <CardContent className="p-[33px] flex flex-col gap-8">
        <div className="space-y-1">
          <CardTitle className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-8 p-0">
            Session Stats
          </CardTitle>
          <p className="text-[16px] text-[#404750] leading-6">
            Based on your recent session history (stored locally in your browser).
          </p>
        </div>
        <div className="border-t border-[rgba(192,199,209,0.35)] pt-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-xl">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-[0.6px] leading-4">Avg session</p>
              <p className="text-[24px] font-extrabold text-[#0f172a] leading-8">{fmtMs(stats.avgMs)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-[0.6px] leading-4">Last session</p>
              <p className="text-[24px] font-extrabold text-[#0f172a] leading-8">{fmtMs(stats.lastMs)}</p>
            </div>
          </div>
          {emptyStats && (
            <p className="text-[14px] italic text-[rgba(64,71,80,0.7)] leading-5">
              No session history yet. Stats will appear after your first sign-out.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Custom Role Builder (wired to PUT /api/role-permissions) ─────────────────
const ALL_PREVIEW_PERMS = [
  { key: "read:products",    label: "View products" },
  { key: "write:products",   label: "Edit products" },
  { key: "read:customers",   label: "View customers" },
  { key: "write:customers",  label: "Edit customers" },
  { key: "read:ingest",      label: "View ingest jobs" },
  { key: "read:matches",     label: "View product matches" },
  { key: "manage:users",     label: "User management" },
  { key: "manage:settings",  label: "System settings" },
  { key: "read:audit",       label: "Data export / Audit" },
]

const EDITABLE_ROLES = [
  { value: "vendor_viewer",     label: "Vendor Viewer" },
  { value: "vendor_operator",   label: "Vendor Operator" },
  { value: "wellness_manager",  label: "Wellness Manager" },
  { value: "marketing_manager", label: "Marketing Manager" },
]

function CustomRoleBuilderPreview() {
  const { toast } = useToast()
  const [roleName, setRoleName] = React.useState("")
  const [targetRole, setTargetRole] = React.useState("vendor_viewer")
  const [perms, setPerms] = React.useState<Record<string, boolean>>({})
  const [previewed, setPreviewed] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const togglePerm = (key: string) => setPerms((p) => ({ ...p, [key]: !p[key] }))
  const selectedPerms = Object.keys(perms).filter((k) => perms[k])
  const canSave = roleName.trim().length > 0 && selectedPerms.length > 0

  async function handleSaveRole() {
    setSaving(true)
    try {
      const res = await apiFetch("/api/role-permissions", {
        method: "PUT",
        body: JSON.stringify({ role: targetRole, permissions: selectedPerms }),
      })
      if (res.ok) {
        toast({ title: "Role permissions saved", description: `"${roleName}" applied to ${EDITABLE_ROLES.find(r => r.value === targetRole)?.label}.` })
      } else {
        const body = await res.json().catch(() => ({}))
        toast({ title: "Save failed", description: body?.detail ?? "Could not save permissions.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Save failed", description: "Network error.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <CardHeader className="border-b border-[#f1f5f9] pb-[20px] pt-5 px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-[16px] font-bold text-[#0f172a]">Custom Role Builder</CardTitle>
            <CardDescription className="text-[13px] text-[#64748b] mt-1">
              Design a permission set and apply it to any editable role in your vendor account.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="gap-2 border-[#cbd5e1] text-[#334155]"
              disabled={!roleName.trim()}
              onClick={() => setPreviewed(true)}
            >
              Preview
            </Button>
            <Button
              className="bg-primary hover:bg-[#003070] text-white gap-2"
              disabled={!canSave || saving}
              onClick={handleSaveRole}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save to Role
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Info note */}
        <div className="flex items-start gap-2 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] px-4 py-3">
          <span className="text-[13px] text-[#1e40af]">Changes apply to the selected role&apos;s permission set for your vendor only.</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b]">Role Name</Label>
            <Input
              value={roleName}
              onChange={(e) => { setRoleName(e.target.value); setPreviewed(false) }}
              placeholder="e.g. Wellness Manager"
              className="border-[#cbd5e1]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b]">Apply to Role</Label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {EDITABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b]">Permissions Grid</Label>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {ALL_PREVIEW_PERMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[13px] text-[#334155]">{label}</span>
                <Switch
                  checked={!!perms[key]}
                  onCheckedChange={() => togglePerm(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {previewed && (
          <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2 text-[13px]">
            <p className="font-semibold text-[#0f172a]">"{roleName}" would have access to:</p>
            <ul className="space-y-1 ml-2">
              {ALL_PREVIEW_PERMS.map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${perms[key] ? "bg-[#10b981]" : "bg-[#e2e8f0]"}`} />
                  <span className={perms[key] ? "text-[#0f172a]" : "text-[#94a3b8] line-through"}>{label}</span>
                </li>
              ))}
            </ul>
            {selectedPerms.length === 0 && (
              <p className="text-[#ef4444] text-[12px]">No permissions selected — this role could not access any features.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { authContext } = useAuth()
  const [orgName, setOrgName] = useState("")
  const [orgDomain, setOrgDomain] = useState("")
  const [orgTimezone, setOrgTimezone] = useState("America/New_York")
  const [autoMatching, setAutoMatching] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [dataRetention, setDataRetention] = useState(false)
  const [autoBackups, setAutoBackups] = useState(true)
  const [cloudStorage, setCloudStorage] = useState(true)
  const [require2fa, setRequire2fa] = useState(false)
  const [sessionTimeoutEnabled, setSessionTimeoutEnabled] = useState(true)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState("60")
  const [ipRestrictions, setIpRestrictions] = useState(false)
  const [auditLogging, setAuditLogging] = useState(true)
  const [graceDays, setGraceDays] = useState("0")
  const [apiKeys, setApiKeys] = useState<{ id: string; key_prefix: string; label: string; environment: string; is_active: boolean }[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [passwordMinLength, setPasswordMinLength] = useState("8")
  const [passwordRequireUpper, setPasswordRequireUpper] = useState(false)
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(false)
  const [passwordRequireSpecial, setPasswordRequireSpecial] = useState(false)
  const [lockoutMaxAttempts, setLockoutMaxAttempts] = useState("5")
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState("15")

  // ── Branding state ─────────────────────────────────────────────────────────
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("")
  const [brandingFaviconUrl, setBrandingFaviconUrl] = useState("")
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("#2073BD")
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState("#64748b")
  const [brandingAccentColor, setBrandingAccentColor] = useState("#10b981")
  const [brandingCopyright, setBrandingCopyright] = useState("")
  const [brandingWelcomeMessage, setBrandingWelcomeMessage] = useState("")
  const [brandingFontUrl, setBrandingFontUrl] = useState("")
  const [savingBranding, setSavingBranding] = useState(false)

  // ── Privacy / GDPR state ───────────────────────────────────────────────────
  interface PrivacyUser { userId: string; email: string; displayName?: string; role: string; status?: string; joinedAt?: string }
  const [privacyUsers, setPrivacyUsers] = useState<PrivacyUser[]>([])
  const [exportingUserId, setExportingUserId] = useState<string | null>(null)
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState<PrivacyUser | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState("")
  const [purging, setPurging] = useState(false)

  // ── API Integration state ──────────────────────────────────────────────────
  const [usdaApiKey, setUsdaApiKey] = useState("")
  const [nutritionLabelApiKey, setNutritionLabelApiKey] = useState("")
  const [complianceApiKey, setComplianceApiKey] = useState("")
  const [ga4MeasurementId, setGa4MeasurementId] = useState("")
  const [mixpanelToken, setMixpanelToken] = useState("")
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false)
  const [integrationDialogTarget, setIntegrationDialogTarget] = useState<"usda" | "nutrition_label" | "compliance_checker" | null>(null)
  const [integrationDialogKey, setIntegrationDialogKey] = useState("")
  const [savingIntegration, setSavingIntegration] = useState(false)

  // ── Catalog Sync state ────────────────────────────────────────────────────
  const [catalogPlatform, setCatalogPlatform] = useState<"shopify" | "woocommerce" | "bigcommerce">("shopify")
  const [catalogStoreUrl, setCatalogStoreUrl] = useState("")
  const [catalogApiKey, setCatalogApiKey] = useState("")
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [catalogSyncing, setCatalogSyncing] = useState(false)
  const [catalogSyncResult, setCatalogSyncResult] = useState<{ synced: number; source: string } | null>(null)

  // Load catalog config on mount
  React.useEffect(() => {
    apiFetch("/api/v1/catalog/sync/config")
      .then((r) => r.json().catch(() => ({})))
      .then((cfg: any) => {
        if (cfg.platform) setCatalogPlatform(cfg.platform)
        if (cfg.store_url) setCatalogStoreUrl(cfg.store_url)
      })
      .catch(() => {})
  }, [])

  async function handleSaveCatalog() {
    setSavingCatalog(true)
    try {
      await apiFetch("/api/v1/catalog/sync/config", {
        method: "PUT",
        body: JSON.stringify({ platform: catalogPlatform, store_url: catalogStoreUrl, api_key: catalogApiKey || undefined }),
      })
      toast({ title: "Catalog sync config saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSavingCatalog(false)
    }
  }

  async function handleCatalogSync() {
    if (!catalogStoreUrl || !catalogApiKey) {
      toast({ title: "Enter store URL and API key first", variant: "destructive" })
      return
    }
    setCatalogSyncing(true)
    setCatalogSyncResult(null)
    try {
      const res = await apiFetch("/api/v1/catalog/sync", {
        method: "POST",
        body: JSON.stringify({ platform: catalogPlatform, store_url: catalogStoreUrl, api_key: catalogApiKey }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setCatalogSyncResult({ synced: json.synced ?? 0, source: json.source ?? catalogPlatform })
        toast({ title: `Synced ${json.synced ?? 0} products from ${catalogPlatform}` })
      } else {
        toast({ title: "Sync failed", description: json.detail ?? "Partner API error", variant: "destructive" })
      }
    } catch {
      toast({ title: "Sync failed", variant: "destructive" })
    } finally {
      setCatalogSyncing(false)
    }
  }

  async function handleResync() {
    await handleSaveCatalog()
    await handleCatalogSync()
  }

  // ── CRM Integration state ──────────────────────────────────────────────────
  const [crmProvider, setCrmProvider] = useState<"none" | "hubspot" | "salesforce">("none")
  const [crmAccessToken, setCrmAccessToken] = useState("")
  const [crmApiKey, setCrmApiKey] = useState("")
  const [crmInstanceUrl, setCrmInstanceUrl] = useState("")
  const [savingCrm, setSavingCrm] = useState(false)
  const [crmSyncing, setCrmSyncing] = useState(false)
  const [crmSyncResult, setCrmSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null)

  const [generateKeyOpen, setGenerateKeyOpen] = useState(false)
  const [newKeyModal, setNewKeyModal] = useState<{ api_key: string; hmac_secret: string; environment: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
  const { toast } = useToast()

  // Role Permissions tab
  const [usersByRole, setUsersByRole] = useState<Record<RoleKey, { displayName?: string; email: string }[]>>({
    superadmin: [],
    vendor_admin: [],
    vendor_operator: [],
    wellness_manager: [],
    marketing_manager: [],
    vendor_viewer: [],
  })
  const [rolePermissions, setRolePermissions] = useState<Record<RoleKey, Record<string, boolean>>>({
    superadmin:        { "*": true, "manage:users": true, "manage:settings": true, "read:audit": true },
    vendor_admin:      { "manage:users": true, "manage:settings": true, "write:products": true, "read:audit": true },
    vendor_operator:   { "write:products": true, "write:customers": true, "write:ingest": true },
    wellness_manager:  { "read:customers": true, "read:products": true, "read:audit": true },
    marketing_manager: { "read:customers": true, "read:products": true, "write:vendors": true, "read:audit": true },
    vendor_viewer:     { "read:products": true, "read:customers": true },
  })
  const [savingPermissions, setSavingPermissions] = useState(false)

  // ── Webhook state ─────────────────────────────────────────────────────────
  interface WebhookEndpoint {
    id: string
    url: string
    description: string | null
    events: string[]
    enabled: boolean
    createdAt: string
  }
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["product.match.found", "import.completed"])
  const [webhookSaving, setWebhookSaving] = useState(false)
  const [webhookTestingId, setWebhookTestingId] = useState<string | null>(null)

  // ── Communications state ──────────────────────────────────────────────────
  type EmailTemplate = { subject: string; previewText: string; bodyText: string }
  const DEFAULT_ONBOARDING: EmailTemplate = {
    subject: "Welcome to the platform!",
    previewText: "Get started with your wellness journey",
    bodyText: "Hi {{name}},\n\nWelcome! We're thrilled to have you on board.\n\nTo get started, complete your health profile and explore personalized product recommendations.\n\nBest,\nThe Team",
  }
  const DEFAULT_REENGAGEMENT: EmailTemplate = {
    subject: "We miss you — come back and check your recommendations",
    previewText: "New products matched to your health profile",
    bodyText: "Hi {{name}},\n\nIt's been a while! We have new products tailored specifically for your health goals.\n\nLog in to see what's new.\n\nBest,\nThe Team",
  }
  const [onboardingTemplate, setOnboardingTemplate] = useState<EmailTemplate>(DEFAULT_ONBOARDING)
  const [reengagementTemplate, setReengagementTemplate] = useState<EmailTemplate>(DEFAULT_REENGAGEMENT)
  const [editingTemplate, setEditingTemplate] = useState<"onboarding" | "reengagement" | null>(null)
  const [editTemplateForm, setEditTemplateForm] = useState<EmailTemplate>(DEFAULT_ONBOARDING)
  const [previewTemplate, setPreviewTemplate] = useState<"onboarding" | "reengagement" | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState("")
  const [announcementMessage, setAnnouncementMessage] = useState("")
  const [announcementPriority, setAnnouncementPriority] = useState<"high" | "medium" | "low">("medium")
  const [announcementExpiry, setAnnouncementExpiry] = useState<"1d" | "3d" | "7d" | "never">("3d")
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)

  const EVENT_OPTIONS = [
    { value: "product.match.found", label: "Product Match Found" },
    { value: "import.completed", label: "Import Completed" },
    { value: "compliance.alert", label: "Compliance Alert" },
    { value: "customer.profile.updated", label: "Customer Profile Updated" },
    { value: "quality.score.low", label: "Quality Score Low" },
    { value: "customer.created", label: "Customer Created" },
    { value: "customer.updated", label: "Customer Updated" },
    { value: "health_profile.updated", label: "Health Profile Updated" },
  ]

  // ── API Integration helpers ────────────────────────────────────────────────
  const isIntegrationConnected = (apiKey: string) => apiKey.trim().length > 0

  const openIntegrationDialog = (target: "usda" | "nutrition_label" | "compliance_checker", currentKey: string) => {
    setIntegrationDialogTarget(target)
    setIntegrationDialogKey(currentKey)
    setIntegrationDialogOpen(true)
  }

  const handleSaveIntegration = async () => {
    if (!integrationDialogTarget || !integrationDialogKey.trim()) return
    setSavingIntegration(true)
    try {
      const settingsKeyMap: Record<"usda" | "nutrition_label" | "compliance_checker", string> = {
        usda: SETTINGS_KEYS.integrationUsdaKey,
        nutrition_label: SETTINGS_KEYS.integrationNutritionLabelKey,
        compliance_checker: SETTINGS_KEYS.integrationComplianceKey,
      }
      const setterMap: Record<"usda" | "nutrition_label" | "compliance_checker", (v: string) => void> = {
        usda: setUsdaApiKey,
        nutrition_label: setNutritionLabelApiKey,
        compliance_checker: setComplianceApiKey,
      }
      const settingsKey = settingsKeyMap[integrationDialogTarget]
      const setter = setterMap[integrationDialogTarget]
      if (!settingsKey || !setter) {
        toast({ title: "Failed to save", description: "Unknown integration target.", variant: "destructive" })
        return
      }
      const trimmedKey = integrationDialogKey.trim()
      const res = await apiFetch(`/api/settings/${settingsKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: trimmedKey }),
      })
      if (res.ok) {
        setter(trimmedKey)
        toast({ title: "Integration connected", description: "API key saved successfully." })
        setIntegrationDialogOpen(false)
        setIntegrationDialogKey("")
      } else {
        toast({ title: "Failed to save", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" })
    } finally {
      setSavingIntegration(false)
    }
  }

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/webhooks")
      if (res.ok) {
        const json = await res.json()
        setWebhooks(json.data ?? [])
      }
    } catch {}
  }, [])

  const handleAddWebhook = async () => {
    const trimmed = webhookUrl.trim()
    if (!trimmed) return
    try { new URL(trimmed) } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL (include https://)", variant: "destructive" })
      return
    }
    setWebhookSaving(true)
    try {
      const res = await apiFetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, events: webhookEvents, enabled: true }),
      })
      if (res.ok) {
        const json = await res.json()
        setWebhooks((prev) => [...prev, json.data])
        setWebhookUrl("")
        setWebhookEvents(["product.match.found", "import.completed"])
        toast({ title: "Webhook added", description: trimmed })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Failed to add webhook", description: json.error ?? "Unknown error", variant: "destructive" })
      }
    } finally {
      setWebhookSaving(false)
    }
  }

  const handleToggleWebhook = async (id: string, enabled: boolean) => {
    try {
      const res = await apiFetch(`/api/v1/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, enabled } : w))
      }
    } catch {}
  }

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/webhooks/${id}`, { method: "DELETE" })
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id))
        toast({ title: "Webhook removed" })
      }
    } catch {}
  }

  const handleTestWebhook = async (id: string) => {
    setWebhookTestingId(id)
    try {
      const res = await apiFetch(`/api/v1/webhooks/${id}/test`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (json.data?.success) {
        toast({ title: "Test delivered", description: `HTTP ${json.data.status}` })
      } else {
        toast({ title: "Test failed", description: json.data?.responseBody ?? json.error ?? "No response", variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message, variant: "destructive" })
    } finally {
      setWebhookTestingId(null)
    }
  }

  const handleSaveTemplate = async (type: "onboarding" | "reengagement") => {
    setSavingTemplate(true)
    try {
      const key = type === "onboarding" ? SETTINGS_KEYS.emailTemplateOnboarding : SETTINGS_KEYS.emailTemplateReengagement
      await apiFetch(`/api/v1/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(editTemplateForm) }),
      })
      if (type === "onboarding") setOnboardingTemplate(editTemplateForm)
      else setReengagementTemplate(editTemplateForm)
      setEditingTemplate(null)
      toast({ title: "Template saved" })
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" })
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim()) return
    setCreatingAnnouncement(true)
    try {
      const res = await apiFetch("/api/v1/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          description: announcementMessage.trim() || undefined,
          priority: announcementPriority,
          expiresIn: announcementExpiry === "never" ? undefined : announcementExpiry,
        }),
      })
      if (res.ok) {
        setAnnouncementTitle("")
        setAnnouncementMessage("")
        setAnnouncementPriority("medium")
        setAnnouncementExpiry("3d")
        toast({ title: "Announcement created", description: "It will appear as a banner for all users." })
      } else {
        toast({ title: "Failed to create announcement", variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to create announcement", variant: "destructive" })
    } finally {
      setCreatingAnnouncement(false)
    }
  }

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        const settings = data.data || data.settings || []
        const map = new Map<string, string>()
        for (const s of settings) {
          map.set(s.key || s.setting_key, s.value || s.setting_value)
        }
        if (map.has(SETTINGS_KEYS.orgName)) setOrgName(map.get(SETTINGS_KEYS.orgName)!)
        if (map.has(SETTINGS_KEYS.orgDomain)) setOrgDomain(normalizeDomain(map.get(SETTINGS_KEYS.orgDomain) || ""))
        if (map.has(SETTINGS_KEYS.orgTimezone)) setOrgTimezone(map.get(SETTINGS_KEYS.orgTimezone)!)
        if (map.has(SETTINGS_KEYS.autoMatching)) setAutoMatching(map.get(SETTINGS_KEYS.autoMatching) === "true")
        if (map.has(SETTINGS_KEYS.emailNotifications)) setEmailNotifications(map.get(SETTINGS_KEYS.emailNotifications) === "true")
        if (map.has(SETTINGS_KEYS.dataRetention)) setDataRetention(map.get(SETTINGS_KEYS.dataRetention) === "true")
        if (map.has(SETTINGS_KEYS.autoBackups)) setAutoBackups(map.get(SETTINGS_KEYS.autoBackups) === "true")
        if (map.has(SETTINGS_KEYS.cloudStorage)) setCloudStorage(map.get(SETTINGS_KEYS.cloudStorage) === "true")
        if (map.has(SETTINGS_KEYS.require2fa)) setRequire2fa(map.get(SETTINGS_KEYS.require2fa) === "true")
        if (map.has(SETTINGS_KEYS.sessionTimeoutEnabled)) setSessionTimeoutEnabled(map.get(SETTINGS_KEYS.sessionTimeoutEnabled) === "true")
        if (map.has(SETTINGS_KEYS.sessionTimeoutMinutes)) setSessionTimeoutMinutes(map.get(SETTINGS_KEYS.sessionTimeoutMinutes) ?? "60")
        if (map.has(SETTINGS_KEYS.ipRestrictions)) setIpRestrictions(map.get(SETTINGS_KEYS.ipRestrictions) === "true")
        if (map.has(SETTINGS_KEYS.auditLogging)) setAuditLogging(map.get(SETTINGS_KEYS.auditLogging) === "true")
        if (map.has(SETTINGS_KEYS.accessRevocationGraceDays)) setGraceDays(map.get(SETTINGS_KEYS.accessRevocationGraceDays) ?? "0")
        if (map.has(SETTINGS_KEYS.passwordMinLength)) setPasswordMinLength(map.get(SETTINGS_KEYS.passwordMinLength) ?? "8")
        if (map.has(SETTINGS_KEYS.passwordRequireUpper)) setPasswordRequireUpper(map.get(SETTINGS_KEYS.passwordRequireUpper) === "true")
        if (map.has(SETTINGS_KEYS.passwordRequireNumber)) setPasswordRequireNumber(map.get(SETTINGS_KEYS.passwordRequireNumber) === "true")
        if (map.has(SETTINGS_KEYS.passwordRequireSpecial)) setPasswordRequireSpecial(map.get(SETTINGS_KEYS.passwordRequireSpecial) === "true")
        if (map.has(SETTINGS_KEYS.lockoutMaxAttempts)) setLockoutMaxAttempts(map.get(SETTINGS_KEYS.lockoutMaxAttempts) ?? "5")
        if (map.has(SETTINGS_KEYS.lockoutDurationMinutes)) setLockoutDurationMinutes(map.get(SETTINGS_KEYS.lockoutDurationMinutes) ?? "15")
        if (map.has(SETTINGS_KEYS.brandingLogoUrl)) setBrandingLogoUrl(map.get(SETTINGS_KEYS.brandingLogoUrl) ?? "")
        if (map.has(SETTINGS_KEYS.brandingFaviconUrl)) setBrandingFaviconUrl(map.get(SETTINGS_KEYS.brandingFaviconUrl) ?? "")
        if (map.has(SETTINGS_KEYS.brandingPrimaryColor)) setBrandingPrimaryColor(map.get(SETTINGS_KEYS.brandingPrimaryColor) ?? "#2073BD")
        if (map.has(SETTINGS_KEYS.brandingSecondaryColor)) setBrandingSecondaryColor(map.get(SETTINGS_KEYS.brandingSecondaryColor) ?? "#64748b")
        if (map.has(SETTINGS_KEYS.brandingAccentColor)) setBrandingAccentColor(map.get(SETTINGS_KEYS.brandingAccentColor) ?? "#10b981")
        if (map.has(SETTINGS_KEYS.brandingCopyright)) setBrandingCopyright(map.get(SETTINGS_KEYS.brandingCopyright) ?? "")
        if (map.has(SETTINGS_KEYS.brandingWelcomeMessage)) setBrandingWelcomeMessage(map.get(SETTINGS_KEYS.brandingWelcomeMessage) ?? "")
        if (map.has(SETTINGS_KEYS.brandingFontUrl)) setBrandingFontUrl(map.get(SETTINGS_KEYS.brandingFontUrl) ?? "")
        if (map.has(SETTINGS_KEYS.crmProvider)) setCrmProvider((map.get(SETTINGS_KEYS.crmProvider) as any) ?? "none")
        if (map.has(SETTINGS_KEYS.crmAccessToken)) setCrmAccessToken(map.get(SETTINGS_KEYS.crmAccessToken) ?? "")
        if (map.has(SETTINGS_KEYS.crmApiKey)) setCrmApiKey(map.get(SETTINGS_KEYS.crmApiKey) ?? "")
        if (map.has(SETTINGS_KEYS.crmInstanceUrl)) setCrmInstanceUrl(map.get(SETTINGS_KEYS.crmInstanceUrl) ?? "")
        if (map.has(SETTINGS_KEYS.integrationUsdaKey)) setUsdaApiKey(map.get(SETTINGS_KEYS.integrationUsdaKey) ?? "")
        if (map.has(SETTINGS_KEYS.integrationNutritionLabelKey)) setNutritionLabelApiKey(map.get(SETTINGS_KEYS.integrationNutritionLabelKey) ?? "")
        if (map.has(SETTINGS_KEYS.integrationComplianceKey)) setComplianceApiKey(map.get(SETTINGS_KEYS.integrationComplianceKey) ?? "")
        if (map.has(SETTINGS_KEYS.integrationGa4Id)) setGa4MeasurementId(map.get(SETTINGS_KEYS.integrationGa4Id) ?? "")
        if (map.has(SETTINGS_KEYS.integrationMixpanelToken)) setMixpanelToken(map.get(SETTINGS_KEYS.integrationMixpanelToken) ?? "")
        if (map.has(SETTINGS_KEYS.emailTemplateOnboarding)) {
          try { setOnboardingTemplate(JSON.parse(map.get(SETTINGS_KEYS.emailTemplateOnboarding)!)) } catch { /* use default */ }
        }
        if (map.has(SETTINGS_KEYS.emailTemplateReengagement)) {
          try { setReengagementTemplate(JSON.parse(map.get(SETTINGS_KEYS.emailTemplateReengagement)!)) } catch { /* use default */ }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Fetch API keys for Security tab
  const fetchApiKeys = useCallback(async () => {
    try {
      setApiKeysLoading(true)
      const res = await apiFetch("/api/v1/keys")
      if (res.ok) {
        const body = await res.json().catch(() => ({} as any))
        const list = Array.isArray(body?.data) ? body.data : []
        setApiKeys(list.filter((k: any) => k.is_active !== false && !k.revoked_at))
      }
    } catch {
      setApiKeys([])
    } finally {
      setApiKeysLoading(false)
    }
  }, [])
  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  // Fetch users and role permissions for Role Permissions tab
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [usersRes, permsRes] = await Promise.all([
          apiFetch("/api/users"),
          apiFetch("/api/role-permissions"),
        ])

        if (!cancelled && usersRes.ok) {
          const body = await usersRes.json().catch(() => ({} as any))
          const list = Array.isArray(body?.data) ? body.data : []
          const byRole: Record<RoleKey, { displayName?: string; email: string }[]> = {
            superadmin: [],
            vendor_admin: [],
            vendor_viewer: [],
          }
          for (const u of list) {
            const role = (u.role || "vendor_viewer") as RoleKey
            if (byRole[role]) {
              byRole[role].push({
                displayName: u.displayName,
                email: u.email || "",
              })
            }
          }
          setUsersByRole(byRole)
        }

        if (!cancelled && permsRes.ok) {
          const body = await permsRes.json().catch(() => ({} as any))
          const roles = body?.roles || {}
          setRolePermissions((prev) => {
            const next = { ...prev }
            for (const role of ROLE_CONFIG) {
              const perms = roles[role.key] || []
              if (role.key === "superadmin" && perms.length === 0) continue // keep default
              const permSet = new Set(perms)
              const map: Record<string, boolean> = {}
              for (const p of role.permissions) {
                map[p.permKey] = p.permKey === "*" ? permSet.has("*") : permSet.has(p.permKey)
              }
              next[role.key] = map
            }
            return next
          })
        }
      } catch {
        // Non-fatal: use defaults
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleTogglePermission = (roleKey: RoleKey, permKey: string, checked: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [permKey]: checked },
    }))
  }

  const handleSavePermissions = async () => {
    try {
      setSavingPermissions(true)
      setError(null)
      setSuccess(null)

      const editableRoles: RoleKey[] = ["vendor_admin", "vendor_operator", "vendor_viewer", "wellness_manager", "marketing_manager"]

      for (const roleKey of editableRoles) {
        const perms = rolePermissions[roleKey] || {}
        const permKeys = Object.entries(perms)
          .filter(([, v]) => v)
          .map(([k]) => k)

        const res = await apiFetch("/api/role-permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: roleKey, permissions: permKeys }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.detail || `Failed to save ${roleKey} permissions`)
        }
      }

      setSuccess("Permissions saved")
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to save permissions")
    } finally {
      setSavingPermissions(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    const res = await apiFetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    })
    if (!res.ok) {
      throw new Error(`Failed to save ${key}`)
    }
  }

  const handleSaveOrg = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const domainToSave = normalizeDomain(orgDomain)
      await Promise.all([
        saveSetting(SETTINGS_KEYS.orgName, orgName),
        saveSetting(SETTINGS_KEYS.orgDomain, domainToSave),
        saveSetting(SETTINGS_KEYS.orgTimezone, orgTimezone),
      ])
      setSuccess("Organization settings saved")
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePrefs = async () => {
    try {
      setSavingPrefs(true)
      setError(null)
      setSuccess(null)
      await Promise.all([
        saveSetting(SETTINGS_KEYS.autoMatching, String(autoMatching)),
        saveSetting(SETTINGS_KEYS.emailNotifications, String(emailNotifications)),
        saveSetting(SETTINGS_KEYS.dataRetention, String(dataRetention)),
      ])
      setSuccess("Preferences saved")
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to save preferences")
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleSaveSecuritySettings = async () => {
    try {
      setSavingSecurity(true)
      setError(null)
      setSuccess(null)
      await Promise.all([
        saveSetting(SETTINGS_KEYS.require2fa, String(require2fa)),
        saveSetting(SETTINGS_KEYS.sessionTimeoutEnabled, String(sessionTimeoutEnabled)),
        saveSetting(SETTINGS_KEYS.sessionTimeoutMinutes, String(Math.max(1, parseInt(sessionTimeoutMinutes, 10) || 60))),
        saveSetting(SETTINGS_KEYS.ipRestrictions, String(ipRestrictions)),
        saveSetting(SETTINGS_KEYS.auditLogging, String(auditLogging)),
        saveSetting(SETTINGS_KEYS.accessRevocationGraceDays, String(Math.max(0, parseInt(graceDays, 10) || 0))),
        saveSetting(SETTINGS_KEYS.passwordMinLength, String(Math.max(6, parseInt(passwordMinLength, 10) || 8))),
        saveSetting(SETTINGS_KEYS.passwordRequireUpper, String(passwordRequireUpper)),
        saveSetting(SETTINGS_KEYS.passwordRequireNumber, String(passwordRequireNumber)),
        saveSetting(SETTINGS_KEYS.passwordRequireSpecial, String(passwordRequireSpecial)),
        saveSetting(SETTINGS_KEYS.lockoutMaxAttempts, String(Math.max(1, parseInt(lockoutMaxAttempts, 10) || 5))),
        saveSetting(SETTINGS_KEYS.lockoutDurationMinutes, String(Math.max(1, parseInt(lockoutDurationMinutes, 10) || 15))),
      ])
      setSuccess("Security settings saved")
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to save security settings")
    } finally {
      setSavingSecurity(false)
    }
  }

  const handleSaveBranding = async () => {
    try {
      setSavingBranding(true)
      setError(null)
      setSuccess(null)
      await Promise.all([
        saveSetting(SETTINGS_KEYS.brandingLogoUrl, brandingLogoUrl.trim()),
        saveSetting(SETTINGS_KEYS.brandingFaviconUrl, brandingFaviconUrl.trim()),
        saveSetting(SETTINGS_KEYS.brandingPrimaryColor, brandingPrimaryColor.trim()),
        saveSetting(SETTINGS_KEYS.brandingSecondaryColor, brandingSecondaryColor.trim()),
        saveSetting(SETTINGS_KEYS.brandingAccentColor, brandingAccentColor.trim()),
        saveSetting(SETTINGS_KEYS.brandingCopyright, brandingCopyright.trim()),
        saveSetting(SETTINGS_KEYS.brandingWelcomeMessage, brandingWelcomeMessage.trim()),
        saveSetting(SETTINGS_KEYS.brandingFontUrl, brandingFontUrl.trim()),
      ])
      setSuccess("Branding settings saved — reload to see changes")
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err?.message || "Failed to save branding settings")
    } finally {
      setSavingBranding(false)
    }
  }

  const handleSaveCrm = async () => {
    try {
      setSavingCrm(true)
      setError(null)
      await Promise.all([
        saveSetting(SETTINGS_KEYS.crmProvider, crmProvider),
        saveSetting(SETTINGS_KEYS.crmAccessToken, crmAccessToken.trim()),
        saveSetting(SETTINGS_KEYS.crmApiKey, crmApiKey.trim()),
        saveSetting(SETTINGS_KEYS.crmInstanceUrl, crmInstanceUrl.trim()),
      ])
      toast({ title: "CRM settings saved" })
    } catch (err: any) {
      setError(err?.message || "Failed to save CRM settings")
    } finally {
      setSavingCrm(false)
    }
  }

  const handleCrmSync = async () => {
    setCrmSyncing(true)
    setCrmSyncResult(null)
    try {
      const res = await apiFetch("/api/v1/integrations/crm/sync", { method: "POST" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((body as any)?.error ?? "Sync failed")
      setCrmSyncResult({ synced: body.synced ?? 0, failed: body.failed ?? 0, total: body.total ?? 0 })
      toast({ title: "CRM sync complete", description: `${body.synced}/${body.total} contacts synced` })
    } catch (err: any) {
      toast({ title: "CRM sync failed", description: err?.message, variant: "destructive" })
    } finally {
      setCrmSyncing(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return
    try {
      const res = await apiFetch(`/api/v1/keys/${keyId}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "API key revoked" })
        fetchApiKeys()
      } else {
        const body = await res.json().catch(() => ({}))
        toast({ title: "Failed to revoke", description: (body as any)?.message, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Failed to revoke", description: err?.message, variant: "destructive" })
    }
  }

  const handleGenerateKey = async (environment: "live" | "test") => {
    try {
      const res = await apiFetch("/api/v1/keys", {
        method: "POST",
        body: JSON.stringify({
          label: environment === "live" ? "Production" : "Development",
          environment,
          scopes: ["ingest:products", "ingest:customers"],
        }),
      })
      if (res.ok) {
        const body = await res.json()
        setNewKeyModal({
          api_key: body.api_key || "",
          hmac_secret: body.hmac_secret || "",
          environment,
        })
        setGenerateKeyOpen(false)
        fetchApiKeys()
      } else {
        const body = await res.json().catch(() => ({}))
        toast({ title: "Failed to create key", description: (body as any)?.message, variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Failed to create key", description: (err as any)?.message, variant: "destructive" })
    }
  }

  // ── Privacy handlers ───────────────────────────────────────────────────────
  const loadPrivacyUsers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/users")
      if (res.ok) {
        const body = await res.json().catch(() => ({} as any))
        const list = Array.isArray(body?.data) ? body.data : []
        setPrivacyUsers(list.map((u: any) => ({
          userId: u.userId,
          email: u.email || "",
          displayName: u.displayName,
          role: u.role || "vendor_viewer",
          status: u.status ?? "active",
          joinedAt: u.linkedAt ?? null,
        })).filter((u: PrivacyUser) => u.userId))
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadPrivacyUsers()
  }, [loadPrivacyUsers])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExportUser = async (userId: string, email: string) => {
    setExportingUserId(userId)
    try {
      const res = await apiFetch(`/api/users/${userId}/export`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as any)?.detail ?? "Export failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `user-export-${userId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message, variant: "destructive" })
    } finally {
      setExportingUserId(null)
    }
  }

  const handlePurgeUser = async () => {
    if (!purgeTarget || purgeConfirmText !== "DELETE") return
    setPurging(true)
    try {
      const res = await apiFetch(`/api/users/${purgeTarget.userId}/purge`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as any)?.detail ?? "Purge failed")
      }
      toast({ title: "Account purged", description: `${purgeTarget.email} has been permanently deleted.` })
      setPurgeDialogOpen(false)
      setPurgeTarget(null)
      setPurgeConfirmText("")
      await loadPrivacyUsers()
    } catch (err: any) {
      toast({ title: "Purge failed", description: err?.message, variant: "destructive" })
    } finally {
      setPurging(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    if (!navigator?.clipboard?.writeText) {
      toast({ title: "Copy not supported", description: "Clipboard API unavailable in this environment.", variant: "destructive" })
      return
    }
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `${label} copied` }),
      () => toast({ title: "Copy failed", variant: "destructive" })
    )
  }

  return (
    <AppShell title="Settings">
      <div className="p-10 space-y-6 bg-[#f8fafc] min-h-screen">
        <Breadcrumb>
          <BreadcrumbList className="text-[#64748b]">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Portal</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-[#0f172a]">Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-2 pb-8 border-b border-[#e2e8f0]">
          <h1 className="text-[24px] font-bold tracking-[-0.75px] text-[#0f172a]">Settings</h1>
          <p className="text-[16px] text-[#64748b]">Manage your organization preferences and configurations.</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4"><p className="text-red-600 text-sm">{error}</p></CardContent>
          </Card>
        )}
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4"><p className="text-green-600 text-sm">{success}</p></CardContent>
          </Card>
        )}

        <Tabs defaultValue="general" className="space-y-0">
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-[#e2e8f0] bg-transparent p-0">
            <TabsTrigger
              value="general"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Integrations
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Role Permissions
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Data & Storage
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Privacy &amp; GDPR
            </TabsTrigger>
            <TabsTrigger
              value="communications"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Communications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-8 pt-8">
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Organization Settings</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="orgName" className="text-[14px] font-semibold text-[#334155]">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Your organization name"
                      className="border-[#cbd5e1] rounded-[8px] px-4 py-[11px] text-[16px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgDomain" className="text-[14px] font-semibold text-[#334155]">Domain</Label>
                    <div className="flex rounded-[8px] border border-[#cbd5e1] bg-white overflow-hidden">
                      <span className="flex items-center px-4 text-[14px] text-[#94a3b8] bg-[#f8fafc] border-r border-[#cbd5e1]">https://</span>
                      <Input
                        id="orgDomain"
                        value={orgDomain}
                        onChange={(e) => setOrgDomain(normalizeDomain(e.target.value))}
                        placeholder="yourdomain.com"
                        className="border-0 rounded-none px-4 py-[11px] text-[16px] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgTimezone" className="text-[14px] font-semibold text-[#334155]">Default Timezone</Label>
                  <select
                    id="orgTimezone"
                    className="w-full px-4 py-[11px] border border-[#cbd5e1] rounded-[8px] text-[16px] text-[#0f172a] bg-white"
                    value={orgTimezone}
                    onChange={(e) => setOrgTimezone(e.target.value)}
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveOrg}
                    disabled={saving}
                    className="bg-primary hover:bg-[#003366] text-white px-6 py-[10px] text-[16px] font-bold rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">System Preferences</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Configure system-wide behavior and defaults</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-[14px] font-bold text-[#0f172a]">Auto-matching</Label>
                      <p className="text-[12px] text-[#64748b]">Automatically run product matching for new imports</p>
                    </div>
                    <Switch checked={autoMatching} onCheckedChange={setAutoMatching} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="border-t border-[#f1f5f9] flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-[14px] font-bold text-[#0f172a]">Email Notifications</Label>
                      <p className="text-[12px] text-[#64748b]">Send system notifications via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="data-[state=checked]:bg-primary" />
                  </div>
                  <div className="border-t border-[#f1f5f9] flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-[14px] font-bold text-[#0f172a]">Data Retention</Label>
                      <p className="text-[12px] text-[#64748b]">Automatically archive old data after 2 years</p>
                    </div>
                    <Switch checked={dataRetention} onCheckedChange={setDataRetention} className="data-[state=checked]:bg-primary" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSavePrefs}
                    disabled={savingPrefs}
                    className="bg-primary hover:bg-[#003366] text-white px-6 py-[10px] text-[16px] font-bold rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  >
                    {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-8">
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">API Integrations</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Manage external API connections and webhooks</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* USDA Food Data Central */}
                <div className="flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[#fff7ed] flex items-center justify-center shrink-0">
                      <Globe className="h-6 w-6 text-[#ea580c]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">USDA Food Data Central</h3>
                      <p className="text-[12px] text-[#64748b]">Access comprehensive nutritional data for raw and processed foods.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {isIntegrationConnected(usdaApiKey) ? (
                      <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#10b981]" />Connected
                      </span>
                    ) : (
                      <span className="bg-[#f1f5f9] text-[#475569] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#94a3b8]" />Disconnected
                      </span>
                    )}
                    <Button
                      onClick={() => openIntegrationDialog("usda", usdaApiKey)}
                      className={isIntegrationConnected(usdaApiKey)
                        ? "border border-[rgba(0,67,143,0.2)] text-primary font-bold text-[14px] px-4 py-2 rounded-[8px] hover:bg-primary/5 bg-transparent"
                        : "bg-primary hover:bg-[#003366] text-white font-bold text-[14px] px-4 py-2 rounded-[8px]"}
                    >
                      {isIntegrationConnected(usdaApiKey) ? "Configure" : "Connect"}
                    </Button>
                  </div>
                </div>

                {/* Nutrition Label API */}
                <div className="border-t border-[#f1f5f9] flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[#eff6ff] flex items-center justify-center shrink-0">
                      <Database className="h-6 w-6 text-[#2563eb]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">Nutrition Label API</h3>
                      <p className="text-[12px] text-[#64748b]">Generate regulatory compliant nutrition fact labels automatically.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {isIntegrationConnected(nutritionLabelApiKey) ? (
                      <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#10b981]" />Connected
                      </span>
                    ) : (
                      <span className="bg-[#f1f5f9] text-[#475569] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#94a3b8]" />Disconnected
                      </span>
                    )}
                    <Button
                      onClick={() => openIntegrationDialog("nutrition_label", nutritionLabelApiKey)}
                      className={isIntegrationConnected(nutritionLabelApiKey)
                        ? "border border-[rgba(0,67,143,0.2)] text-primary font-bold text-[14px] px-4 py-2 rounded-[8px] hover:bg-primary/5 bg-transparent"
                        : "bg-primary hover:bg-[#003366] text-white font-bold text-[14px] px-4 py-2 rounded-[8px]"}
                    >
                      {isIntegrationConnected(nutritionLabelApiKey) ? "Configure" : "Connect"}
                    </Button>
                  </div>
                </div>

                {/* Compliance Checker */}
                <div className="border-t border-[#f1f5f9] flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[#f5f3ff] flex items-center justify-center shrink-0">
                      <Shield className="h-6 w-6 text-[#7c3aed]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">Compliance Checker</h3>
                      <p className="text-[12px] text-[#64748b]">Verify product formulations against global health regulations.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {isIntegrationConnected(complianceApiKey) ? (
                      <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#10b981]" />Connected
                      </span>
                    ) : (
                      <span className="bg-[#f1f5f9] text-[#475569] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-[#94a3b8]" />Disconnected
                      </span>
                    )}
                    <Button
                      onClick={() => openIntegrationDialog("compliance_checker", complianceApiKey)}
                      className={isIntegrationConnected(complianceApiKey)
                        ? "border border-[rgba(0,67,143,0.2)] text-primary font-bold text-[14px] px-4 py-2 rounded-[8px] hover:bg-primary/5 bg-transparent"
                        : "bg-primary hover:bg-[#003366] text-white font-bold text-[14px] px-4 py-2 rounded-[8px]"}
                    >
                      {isIntegrationConnected(complianceApiKey) ? "Configure" : "Connect"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Analytics 4 */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Analytics Tracking</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Connect your own Google Analytics property to track portal usage</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="size-[48px] rounded-[8px] border border-[#e2e8f0] bg-white flex items-center justify-center shrink-0 p-2">
                    <img src="/logos/google-analytics.png" alt="Google Analytics" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-[14px] text-[#0f172a]">Google Analytics 4</h3>
                    <p className="text-[12px] text-[#64748b]">Enter your GA4 Measurement ID to track page views and user interactions in your own GA4 property. The ID starts with <span className="font-mono">G-</span>.</p>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="G-XXXXXXXXXX"
                        value={ga4MeasurementId}
                        onChange={(e) => setGa4MeasurementId(e.target.value.trim())}
                        className="max-w-xs font-mono border-[#e2e8f0] text-sm"
                      />
                      <Button
                        size="sm"
                        disabled={!ga4MeasurementId.trim()}
                        onClick={async () => {
                          try {
                            await apiFetch(`/api/settings/${SETTINGS_KEYS.integrationGa4Id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ value: ga4MeasurementId.trim() }),
                            })
                            toast({ title: "GA4 Measurement ID saved" })
                          } catch {
                            toast({ title: "Failed to save", variant: "destructive" })
                          }
                        }}
                        className="bg-primary hover:bg-[#003366] text-white"
                      >
                        Save
                      </Button>
                      {ga4MeasurementId && (
                        <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-[#10b981]" />Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mixpanel */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Mixpanel Analytics</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Connect your Mixpanel project to track product usage with per-user event streams</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="size-[48px] rounded-[8px] border border-[#e2e8f0] bg-white flex items-center justify-center shrink-0 p-2">
                    <img src="/logos/mixpanel.png" alt="Mixpanel" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-[14px] text-[#0f172a]">Mixpanel Project Token</h3>
                    <p className="text-[12px] text-[#64748b]">
                      Enter your Mixpanel project token to enable event tracking alongside GA4.
                      Events fired via <span className="font-mono">trackEvent()</span> will automatically mirror to both providers.
                      Find your token in <span className="font-mono">mixpanel.com → Settings → Project</span>.
                    </p>
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="e.g. a1b2c3d4e5f6..."
                        value={mixpanelToken}
                        onChange={(e) => setMixpanelToken(e.target.value.trim())}
                        className="max-w-xs font-mono border-[#e2e8f0] text-sm"
                      />
                      <Button
                        size="sm"
                        disabled={!mixpanelToken.trim()}
                        onClick={async () => {
                          try {
                            await apiFetch(`/api/settings/${SETTINGS_KEYS.integrationMixpanelToken}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ value: mixpanelToken.trim() }),
                            })
                            toast({ title: "Mixpanel token saved" })
                          } catch {
                            toast({ title: "Failed to save", variant: "destructive" })
                          }
                        }}
                        className="bg-primary hover:bg-[#003366] text-white"
                      >
                        Save
                      </Button>
                      {mixpanelToken && (
                        <span className="bg-[#fce7f3] text-[#9d174d] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-[#ec4899]" />Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Events tracked: page_view, campaign_created, segment_created, member_exported, and all portal interactions via the shared trackEvent() utility.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Webhooks</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Configure webhook endpoints for real-time notifications</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Existing webhooks list */}
                {webhooks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Active Endpoints</Label>
                    <div className="space-y-2">
                      {webhooks.map((w) => (
                        <div key={w.id} className="flex items-center justify-between border border-[#e2e8f0] rounded-[8px] px-4 py-3 gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#1e293b] truncate">{w.url}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {w.events.map((ev) => (
                                <span key={ev} className="text-[10px] bg-[#eff6ff] text-primary rounded px-1.5 py-0.5 font-medium">{ev}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={w.enabled}
                              onCheckedChange={(v) => handleToggleWebhook(w.id, v)}
                              className="scale-75"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={webhookTestingId === w.id}
                              onClick={() => handleTestWebhook(w.id)}
                              title="Send test payload"
                              className="h-8 w-8 p-0 text-[#64748b] hover:text-primary"
                            >
                              {webhookTestingId === w.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Zap className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWebhook(w.id)}
                              title="Remove webhook"
                              className="h-8 w-8 p-0 text-[#64748b] hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add new webhook form */}
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl" className="text-[14px] font-bold text-[#0f172a]">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-app.com/webhook"
                    className="border-[#cbd5e1] rounded-[8px] px-4 py-[11px] text-[16px]"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-[14px] font-bold text-[#0f172a]">Events</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {EVENT_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-3">
                        <Checkbox
                          id={`event-${opt.value}`}
                          checked={webhookEvents.includes(opt.value)}
                          onCheckedChange={(checked) => {
                            setWebhookEvents((prev) =>
                              checked ? [...prev, opt.value] : prev.filter((e) => e !== opt.value)
                            )
                          }}
                        />
                        <Label htmlFor={`event-${opt.value}`} className="text-[13px] font-medium text-[#334155] leading-tight">{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="!bg-primary hover:!bg-[#003366] text-white font-bold text-[16px] h-12 min-w-[180px] px-8 py-3 rounded-[12px]"
                  disabled={webhookSaving || !webhookUrl.trim()}
                  onClick={handleAddWebhook}
                >
                  {webhookSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Webhook
                </Button>
              </CardContent>
            </Card>

            {/* CRM Integration Card */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">CRM Integration</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Connect to Salesforce or HubSpot to sync customer contacts automatically.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[14px] font-semibold text-[#334155]">CRM Provider</Label>
                  <div className="flex gap-3">
                    {(["none", "hubspot", "salesforce"] as const).map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={crmProvider === p ? "default" : "outline"}
                        className={`gap-2 ${crmProvider === p ? "bg-primary text-white" : "border-[#cbd5e1] text-[#334155]"}`}
                        onClick={() => setCrmProvider(p)}
                      >
                        {p === "hubspot" && (
                          <img src="/logos/hubspot.png" alt="HubSpot" className="w-4 h-4 object-contain" />
                        )}
                        {p === "salesforce" && (
                          <img src="/logos/salesforce.png" alt="Salesforce" className="w-4 h-4 object-contain" />
                        )}
                        {p === "none" ? "Disabled" : p === "hubspot" ? "HubSpot" : "Salesforce"}
                      </Button>
                    ))}
                  </div>
                </div>

                {crmProvider === "hubspot" && (
                  <div className="space-y-2">
                    <Label className="text-[14px] font-semibold text-[#334155]">HubSpot Access Token</Label>
                    <Input
                      type="password"
                      placeholder="pat-na1-..."
                      value={crmApiKey}
                      onChange={(e) => setCrmApiKey(e.target.value)}
                      className="border-[#cbd5e1] font-mono text-sm"
                    />
                    <p className="text-[12px] text-[#64748b]">Private App token from HubSpot → Settings → Integrations → Private Apps.</p>
                  </div>
                )}

                {crmProvider === "salesforce" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[14px] font-semibold text-[#334155]">Access Token</Label>
                      <Input type="password" placeholder="00D..." value={crmAccessToken} onChange={(e) => setCrmAccessToken(e.target.value)} className="border-[#cbd5e1] font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[14px] font-semibold text-[#334155]">Instance URL</Label>
                      <Input placeholder="https://yourorg.salesforce.com" value={crmInstanceUrl} onChange={(e) => setCrmInstanceUrl(e.target.value)} className="border-[#cbd5e1]" />
                    </div>
                  </>
                )}

                <Separator className="bg-[#f1f5f9]" />

                <div className="flex items-center gap-3 flex-wrap">
                  <Button onClick={handleSaveCrm} disabled={savingCrm} className="bg-primary hover:bg-[#003366] text-white">
                    {savingCrm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save CRM Settings
                  </Button>
                  {crmProvider !== "none" && (
                    <Button variant="outline" onClick={handleCrmSync} disabled={crmSyncing} className="border-[#cbd5e1] text-[#334155]">
                      {crmSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Sync Customers Now
                    </Button>
                  )}
                </div>

                {crmSyncResult && (
                  <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    Sync complete: {crmSyncResult.synced} synced, {crmSyncResult.failed} failed, {crmSyncResult.total} total.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── BI Connectors ── */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">BI Connectors</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">
                  Connect your BI tool using the credentials below. Use your live API key as the authentication token.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const liveKeyPrefix = apiKeys.find((k) => k.environment === "live")?.key_prefix ?? "YOUR_API_KEY"
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: "Tableau",  logo: "/logos/tableau.png", label: "JDBC Connection String", value: `jdbc:tableau://api.nutriportal.com:443/b2b?api_key=${liveKeyPrefix}...` },
                        { name: "Power BI", logo: "/logos/powerbi.png",  label: "OData Feed URL",         value: `https://api.nutriportal.com/odata/v1/analytics?api_key=${liveKeyPrefix}...` },
                        { name: "Looker",   logo: "/logos/looker.png",   label: "LookML Connection",      value: `connection: nutriportal\nhost: api.nutriportal.com\nport: 443\napi_key: ${liveKeyPrefix}...` },
                        { name: "Metabase", logo: "/logos/metabase.png", label: "REST API URL",           value: `https://api.nutriportal.com/api/v3/dataset?api_key=${liveKeyPrefix}...` },
                      ].map((c) => (
                        <div key={c.name} className="rounded-lg border border-[#e2e8f0] p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-[#e2e8f0] bg-white flex items-center justify-center shrink-0 p-1">
                              <img src={c.logo} alt={c.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="font-semibold text-[#0f172a] text-[14px]">{c.name}</span>
                          </div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">{c.label}</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-[11px] bg-[#f8fafc] border border-[#e2e8f0] rounded px-3 py-2 font-mono text-[#334155] truncate">
                              {c.value.split("\n")[0]}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-8 px-3 text-[12px] border-[#cbd5e1] text-[#334155]"
                              onClick={() => copyToClipboard(c.value, c.name)}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* ── Catalog Sync ── */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Catalog Sync</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">
                  Pull products from your e-commerce platform directly into the portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column — Platform + Store URL */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Platform Selection</label>
                      <select
                        value={catalogPlatform}
                        onChange={(e) => setCatalogPlatform(e.target.value as typeof catalogPlatform)}
                        className="w-full bg-[#f3f4f5] border border-[#e2e8f0] rounded-md px-3 py-2.5 text-[14px] text-[#191c1d] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="shopify">Shopify</option>
                        <option value="woocommerce">WooCommerce</option>
                        <option value="bigcommerce">BigCommerce</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Store URL</label>
                      <Input
                        value={catalogStoreUrl}
                        onChange={(e) => setCatalogStoreUrl(e.target.value)}
                        placeholder={
                          catalogPlatform === "shopify" ? "https://store.brand-hq.com"
                          : catalogPlatform === "woocommerce" ? "https://your-store.com"
                          : "abc123xyz (store hash)"
                        }
                        className="bg-[#f3f4f5] border-[#e2e8f0] text-[14px] text-[#191c1d]"
                      />
                    </div>
                  </div>
                  {/* Right column — Admin API Key */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Admin API Key</label>
                    <Input
                      type="password"
                      value={catalogApiKey}
                      onChange={(e) => setCatalogApiKey(e.target.value)}
                      placeholder={
                        catalogPlatform === "shopify" ? "shpat_xxxxxxxxxxxx"
                        : catalogPlatform === "woocommerce" ? "ck_xxxx:cs_xxxx"
                        : "Bearer token from BigCommerce API"
                      }
                      className="bg-[#f3f4f5] border-[#e2e8f0] font-mono text-[14px] text-[#191c1d]"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleResync}
                  disabled={savingCatalog || catalogSyncing}
                  className="bg-primary hover:bg-[#003366] text-white"
                >
                  {(savingCatalog || catalogSyncing)
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <RefreshCw className="h-4 w-4 mr-2" />
                  }
                  Initiate Full Resync
                </Button>

                {catalogSyncResult && (
                  <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    Sync complete: <strong>{catalogSyncResult.synced}</strong> products imported from <strong>{catalogSyncResult.source}</strong>.
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="users" className="space-y-8 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-[18px] font-bold text-[#0f172a]">Role Permissions</h2>
                <p className="text-[14px] text-[#64748b]">Configure permissions for different user roles within the portal.</p>
              </div>
              <Button
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="bg-primary hover:bg-[#003366] text-white font-bold text-[14px] px-8 py-3 rounded-[8px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0"
              >
                {savingPermissions ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Permissions
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ROLE_CONFIG.map((role) => {
                const users = usersByRole[role.key] || []
                const count = Math.max(users.length, 1)
                const initials = users
                  .slice(0, 3)
                  .map((u) => {
                    if (u.displayName) {
                      const parts = u.displayName.trim().split(/\s+/)
                      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
                      return (parts[0]?.slice(0, 2) || "?").toUpperCase()
                    }
                    const e = (u.email || "").split("@")[0]
                    return (e.slice(0, 2) || "?").toUpperCase()
                  })
                const perms = rolePermissions[role.key] || {}
                return (
                  <Card
                    key={role.key}
                    className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden"
                  >
                    <CardContent className="p-6 flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-10 rounded-[8px] flex items-center justify-center shrink-0 ${
                              role.icon === "shield"    ? "bg-[rgba(0,67,143,0.1)]"
                              : role.icon === "heart"    ? "bg-[rgba(239,68,68,0.1)]"
                              : role.icon === "megaphone"? "bg-[rgba(245,158,11,0.1)]"
                              : "bg-[#f1f5f9]"
                            }`}
                          >
                            {role.icon === "shield" ? (
                              <Shield className="h-5 w-5 text-primary" />
                            ) : role.icon === "heart" ? (
                              <Heart className="h-5 w-5 text-red-500" />
                            ) : role.icon === "megaphone" ? (
                              <Megaphone className="h-5 w-5 text-amber-500" />
                            ) : (
                              <User className="h-5 w-5 text-[#64748b]" />
                            )}
                          </div>
                          <h3 className="text-[16px] font-bold text-[#0f172a]">
                            {role.label} <span className="text-black">({count})</span>
                          </h3>
                        </div>
                        <div className="flex items-center -space-x-2">
                          {initials.length > 0 ? (
                            initials.map((init, i) => (
                              <div
                                key={i}
                                className={`size-10 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 border-2 border-white ${
                                  i === 0 && initials.length > 1
                                    ? "bg-[#e5ecf4] text-primary"
                                    : i === 1 && initials.length > 2
                                    ? "bg-[#ffedd5] text-[#ea580c]"
                                    : "bg-[#f1f5f9] text-[#64748b]"
                                }`}
                              >
                                {init}
                              </div>
                            ))
                          ) : (
                            <div className="size-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[16px] font-bold text-[#64748b]">
                              —
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3.5">
                        {role.permissions.map((p) => (
                          <div
                            key={p.permKey}
                            className="flex items-center justify-between w-full"
                          >
                            <span className="text-[14px] text-[#334155]">{p.label}</span>
                            <Checkbox
                              checked={!!perms[p.permKey]}
                              onCheckedChange={(v) =>
                                handleTogglePermission(role.key, p.permKey, v === true)
                              }
                              className="rounded-[4px] border-[#cbd5e1] data-[state=checked]:bg-primary data-[state=checked]:border-primary size-5"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* ── Custom Role Builder Preview (UI preview only) ── */}
            <CustomRoleBuilderPreview />

          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <CardContent className="p-6 relative">
                  <Database className="absolute top-6 right-6 size-[34px] text-[#64748b]" />
                  <p className="text-[14px] font-medium uppercase tracking-[0.7px] text-[#64748b]">Storage Used</p>
                  <p className="text-[30px] font-bold text-[#0f172a] mt-2">2.4 GB / 10 GB</p>
                  <div className="mt-3 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "24%" }} />
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <CardContent className="p-6 relative">
                  <Shield className="absolute top-6 right-6 size-[34px] text-[#22c55e]" />
                  <p className="text-[14px] font-medium uppercase tracking-[0.7px] text-[#64748b]">Last Backup</p>
                  <p className="text-[30px] font-bold text-[#0f172a] mt-2">2 hours ago</p>
                  <p className="text-[14px] text-[#64748b] mt-1">Automatic daily backups</p>
                </CardContent>
              </Card>
              <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                <CardContent className="p-6 relative">
                  <AlertTriangle className="absolute top-6 right-6 size-[34px] text-[#64748b]" />
                  <p className="text-[14px] font-medium uppercase tracking-[0.7px] text-[#64748b]">Data Retention</p>
                  <p className="text-[30px] font-bold text-[#0f172a] mt-2">{dataRetention ? "2 years" : "Disabled"}</p>
                  <p className="text-[14px] text-[#64748b] mt-1">Auto-archive policy</p>
                </CardContent>
              </Card>
            </div>

            {/* Backup Settings card */}
            <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <CardHeader className="border-b border-[#e2e8f0] pb-[17px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold">Backup Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium text-[#0f172a]">Automatic Backups</Label>
                    <p className="text-[14px] text-[#64748b] mt-0.5">Create daily backups of all data</p>
                  </div>
                  <Switch
                    checked={autoBackups}
                    onCheckedChange={async (v) => {
                      setAutoBackups(v)
                      try {
                        await saveSetting(SETTINGS_KEYS.autoBackups, String(v))
                      } catch {
                        setAutoBackups(!v)
                      }
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium text-[#0f172a]">Cloud Storage</Label>
                    <p className="text-[14px] text-[#64748b] mt-0.5">Store backups in cloud storage</p>
                  </div>
                  <Switch
                    checked={cloudStorage}
                    onCheckedChange={async (v) => {
                      setCloudStorage(v)
                      try {
                        await saveSetting(SETTINGS_KEYS.cloudStorage, String(v))
                      } catch {
                        setCloudStorage(!v)
                      }
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>
              <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-6 flex gap-3">
                <Button
                  className="bg-primary hover:bg-[#003366] text-white px-5 py-[11px] rounded-[8px]"
                  onClick={() => toast({ title: "Coming soon" })}
                >
                  Create Backup Now
                </Button>
                <Button
                  variant="outline"
                  className="border-[#cbd5e1] text-[#334155] rounded-[8px]"
                  onClick={() => toast({ title: "Coming soon" })}
                >
                  Download Data
                </Button>
              </div>
            </Card>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-[8px] bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.2)]">
              <Info className="size-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#334155]">
                Data retention policies are applied automatically every Sunday at midnight. For custom retention rules, please contact your account manager.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Security Settings card - first per Figma */}
            <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Security Settings</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Configure global security policies for your organization.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Two-Factor Authentication</Label>
                    <p className="text-[12px] text-[#64748b]">Require 2FA for all users upon login.</p>
                  </div>
                  <Switch checked={require2fa} onCheckedChange={setRequire2fa} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Session Timeout</Label>
                    <p className="text-[12px] text-[#64748b]">Auto-logout after a period of inactivity.</p>
                    {sessionTimeoutEnabled && (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="number"
                          min={1}
                          max={480}
                          value={sessionTimeoutMinutes}
                          onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
                          className="w-20 h-8 text-sm border-[#cbd5e1]"
                        />
                        <span className="text-[13px] text-[#64748b]">minutes</span>
                      </div>
                    )}
                  </div>
                  <Switch checked={sessionTimeoutEnabled} onCheckedChange={setSessionTimeoutEnabled} className="data-[state=checked]:bg-primary mt-0.5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">IP Restrictions</Label>
                    <p className="text-[12px] text-[#64748b]">Limit access to specific IP addresses.</p>
                  </div>
                  <Switch checked={ipRestrictions} onCheckedChange={setIpRestrictions} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Audit Logging</Label>
                    <p className="text-[12px] text-[#64748b]">Log all user actions and system events.</p>
                  </div>
                  <Switch checked={auditLogging} onCheckedChange={setAuditLogging} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Access Revocation Grace Period</Label>
                    <p className="text-[12px] text-[#64748b]">Days after membership expiry before access is automatically revoked (0 = immediate).</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={graceDays}
                    onChange={(e) => setGraceDays(e.target.value)}
                    className="w-20 text-right border border-[#e2e8f0] rounded-[6px] px-3 py-1.5 text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* ── Password Requirements ── */}
                <Separator className="bg-[#f1f5f9]" />
                <div>
                  <Label className="text-[14px] font-bold text-[#0f172a]">Password Requirements</Label>
                  <p className="text-[12px] text-[#64748b] mb-4">Minimum standards enforced at registration and password change.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Minimum Length</label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={6} max={32} value={passwordMinLength}
                          onChange={(e) => setPasswordMinLength(e.target.value)}
                          className="w-20 h-8 text-sm border-[#cbd5e1]" />
                        <span className="text-[13px] text-[#64748b]">characters</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Require uppercase letter", state: passwordRequireUpper, set: setPasswordRequireUpper },
                        { label: "Require number", state: passwordRequireNumber, set: setPasswordRequireNumber },
                        { label: "Require special character", state: passwordRequireSpecial, set: setPasswordRequireSpecial },
                      ].map(({ label, state, set }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[13px] text-[#334155]">{label}</span>
                          <Switch checked={state} onCheckedChange={set} className="data-[state=checked]:bg-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Account Lockout ── */}
                <Separator className="bg-[#f1f5f9]" />
                <div>
                  <Label className="text-[14px] font-bold text-[#0f172a]">Account Lockout</Label>
                  <p className="text-[12px] text-[#64748b] mb-4">Temporarily lock accounts after repeated failed login attempts.</p>
                  <div className="flex flex-wrap gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Max failed attempts</label>
                      <Input type="number" min={1} max={20} value={lockoutMaxAttempts}
                        onChange={(e) => setLockoutMaxAttempts(e.target.value)}
                        className="w-24 h-8 text-sm border-[#cbd5e1]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748b]">Lockout duration</label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} max={1440} value={lockoutDurationMinutes}
                          onChange={(e) => setLockoutDurationMinutes(e.target.value)}
                          className="w-24 h-8 text-sm border-[#cbd5e1]" />
                        <span className="text-[13px] text-[#64748b]">minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="bg-[#f8fafc] border-t border-[#f1f5f9] p-6 flex justify-end">
                <Button
                  className="bg-primary hover:bg-[#003366] text-white font-bold px-6 py-[10px] rounded-[8px]"
                  onClick={handleSaveSecuritySettings}
                  disabled={savingSecurity}
                >
                  {savingSecurity ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Security Settings
                </Button>
              </div>
            </Card>

            {/* Session Stats card */}
            <SessionStatsCard />

            {/* API Keys card — Figma layout; behavior unchanged */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardContent className="p-[33px] flex flex-col gap-8">
                <div className="space-y-1">
                  <CardTitle className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-8 p-0">API Keys</CardTitle>
                  <p className="text-[16px] text-[#404750] leading-6">Manage API keys for external integrations.</p>
                </div>
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {["live", "test"].map((env) => {
                      const key = apiKeys.find((k) => k.environment === env)
                      const label = env === "live" ? "Production API Key" : "Development API Key"
                      const mask = env === "live" ? "nutri_live_••••••••••••••••" : "nutri_test_••••••••••••••••"
                      return (
                        <div key={env} className={`space-y-3 ${env === "test" ? "pt-6 border-t border-[#f1f5f9]" : ""}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Label className="text-[16px] font-bold text-[#0f172a]">{label}</Label>
                            {key ? (
                              <div className="flex flex-wrap gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#c0c7d1] text-[#191c1d] text-[14px] font-bold h-9 px-[17px] rounded-[4px]"
                                  onClick={() => handleGenerateKey(env as "live" | "test")}
                                >
                                  Regenerate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#fee2e2] text-[#dc2626] text-[12px] font-bold rounded-[8px] hover:bg-red-50"
                                  onClick={() => handleRevokeKey(key.id)}
                                >
                                  Revoke
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#c0c7d1] text-[#191c1d] text-[14px] font-bold h-9 px-[17px] rounded-[4px] self-start sm:self-auto"
                                onClick={() => handleGenerateKey(env as "live" | "test")}
                              >
                                Generate
                              </Button>
                            )}
                          </div>
                          <div className="bg-[#edeeef] border border-[rgba(192,199,209,0.35)] rounded-[4px] px-[13px] py-3 flex items-center gap-2 min-h-[46px]">
                            <span className="font-mono text-[14px] text-[#404750] leading-5 flex-1 min-w-0 break-all">
                              {key ? mask : "No key configured"}
                            </span>
                            {key && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(mask, "Key reference")}
                                className="text-[#64748b] hover:text-[#0f172a] p-0.5 shrink-0"
                                aria-label="Copy key reference"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="pt-2 border-t border-[#f1f5f9]">
                  <Button
                    variant="outline"
                    className="border-[#e2e8f0] bg-white text-[#0f172a] font-bold text-[14px] px-6 py-[11px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    onClick={() => setGenerateKeyOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Generate New Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generate New Key dialog - choose environment */}
            <Dialog open={generateKeyOpen} onOpenChange={setGenerateKeyOpen}>
              <DialogContent className="rounded-xl border-[#e2e8f0]">
                <DialogHeader>
                  <DialogTitle>Generate New API Key</DialogTitle>
                  <DialogDescription>Choose the environment for your new API key.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 py-4">
                  <Button
                    className="flex-1 bg-primary hover:bg-[#003366]"
                    onClick={() => handleGenerateKey("live")}
                  >
                    Production (Live)
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-[#e2e8f0]"
                    onClick={() => handleGenerateKey("test")}
                  >
                    Development (Test)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* One-time key display modal */}
            <Dialog open={!!newKeyModal} onOpenChange={(o) => !o && setNewKeyModal(null)}>
              <DialogContent className="rounded-xl border-[#e2e8f0] max-w-lg">
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Store these credentials securely. The API key and HMAC secret are shown only once.
                  </DialogDescription>
                </DialogHeader>
                {newKeyModal && (
                  <div className="space-y-4 py-4">
                    <div>
                      <Label className="text-[12px] text-[#64748b]">API Key</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          readOnly
                          value={newKeyModal.api_key}
                          className="font-mono text-sm bg-[#f1f5f9] border-[#e2e8f0]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(newKeyModal.api_key, "API key")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[12px] text-[#64748b]">HMAC Secret</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          readOnly
                          value={newKeyModal.hmac_secret}
                          className="font-mono text-sm bg-[#f1f5f9] border-[#e2e8f0]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(newKeyModal.hmac_secret, "HMAC secret")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    className="bg-primary hover:bg-[#003366]"
                    onClick={() => setNewKeyModal(null)}
                  >
                    I have stored these securely
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Branding Tab ─────────────────────────────────────────── */}
          <TabsContent value="branding" className="space-y-6 pt-8">
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle className="text-[18px] font-bold text-[#0f172a]">White-Label Branding</CardTitle>
                </div>
                <CardDescription className="text-[14px] text-[#64748b]">
                  Customise the portal appearance for your organisation. Changes apply immediately after saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 px-6 space-y-6">
                <div className="flex gap-8 items-start">
                  {/* Left: form fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                    <div className="space-y-2">
                      <Label htmlFor="branding-logo" className="text-[14px] font-medium text-[#0f172a]">Logo URL</Label>
                      <Input
                        id="branding-logo"
                        placeholder="https://example.com/logo.png"
                        value={brandingLogoUrl}
                        onChange={(e) => setBrandingLogoUrl(e.target.value)}
                        className="border-[#e2e8f0]"
                      />
                      <p className="text-[12px] text-[#64748b]">Displayed in the sidebar header. Recommended: 64×64 px PNG.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding-favicon" className="text-[14px] font-medium text-[#0f172a]">Favicon URL</Label>
                      <Input
                        id="branding-favicon"
                        placeholder="https://example.com/favicon.ico"
                        value={brandingFaviconUrl}
                        onChange={(e) => setBrandingFaviconUrl(e.target.value)}
                        className="border-[#e2e8f0]"
                      />
                      <p className="text-[12px] text-[#64748b]">Browser tab icon. Recommended: 32×32 px ICO or PNG.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding-color" className="text-[14px] font-medium text-[#0f172a]">Primary Colour</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="branding-color"
                          value={brandingPrimaryColor.startsWith("#") ? brandingPrimaryColor : "#2073BD"}
                          onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded border border-[#e2e8f0] p-1"
                        />
                        <Input
                          value={brandingPrimaryColor}
                          onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                          placeholder="#2073BD"
                          className="border-[#e2e8f0] font-mono text-sm"
                        />
                      </div>
                      <p className="text-[12px] text-[#64748b]">Applied to buttons, active nav items and focus rings.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding-secondary-color" className="text-[14px] font-medium text-[#0f172a]">Secondary Colour</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="branding-secondary-color"
                          value={brandingSecondaryColor.startsWith("#") ? brandingSecondaryColor : "#64748b"}
                          onChange={(e) => setBrandingSecondaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded border border-[#e2e8f0] p-1"
                        />
                        <Input
                          value={brandingSecondaryColor}
                          onChange={(e) => setBrandingSecondaryColor(e.target.value)}
                          placeholder="#64748b"
                          className="border-[#e2e8f0] font-mono text-sm"
                        />
                      </div>
                      <p className="text-[12px] text-[#64748b]">Applied to secondary elements, muted text and backgrounds.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding-accent-color" className="text-[14px] font-medium text-[#0f172a]">Accent Colour</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="branding-accent-color"
                          value={brandingAccentColor.startsWith("#") ? brandingAccentColor : "#10b981"}
                          onChange={(e) => setBrandingAccentColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded border border-[#e2e8f0] p-1"
                        />
                        <Input
                          value={brandingAccentColor}
                          onChange={(e) => setBrandingAccentColor(e.target.value)}
                          placeholder="#10b981"
                          className="border-[#e2e8f0] font-mono text-sm"
                        />
                      </div>
                      <p className="text-[12px] text-[#64748b]">Used for highlights, status indicators and accents.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branding-font-url" className="text-[14px] font-medium text-[#0f172a]">Custom Font URL</Label>
                      <Input
                        id="branding-font-url"
                        placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
                        value={brandingFontUrl}
                        onChange={(e) => setBrandingFontUrl(e.target.value)}
                        className="border-[#e2e8f0]"
                      />
                      <p className="text-[12px] text-[#64748b]">Import a custom Google Font or external CSS file.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="branding-copyright" className="text-[14px] font-medium text-[#0f172a]">Copyright Text</Label>
                      <Input
                        id="branding-copyright"
                        placeholder="© 2025 Acme Corp. All rights reserved."
                        value={brandingCopyright}
                        onChange={(e) => setBrandingCopyright(e.target.value)}
                        className="border-[#e2e8f0]"
                      />
                      <p className="text-[12px] text-[#64748b]">Displayed in the portal footer and login page.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="branding-welcome" className="text-[14px] font-medium text-[#0f172a]">Dashboard Welcome Message</Label>
                      <textarea
                        id="branding-welcome"
                        placeholder="Welcome to your wellness portal! Explore your members' health insights below."
                        value={brandingWelcomeMessage}
                        onChange={(e) => setBrandingWelcomeMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                      <p className="text-[12px] text-[#64748b]">Greeting displayed to users on the main dashboard.</p>
                    </div>
                  </div>

                  {/* Right: live preview */}
                  <div className="w-[280px] shrink-0">
                    <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">Live Preview</p>
                    <BrandingLivePreview color={brandingPrimaryColor} logoUrl={brandingLogoUrl} />
                  </div>
                </div>

                <Separator className="bg-[#f1f5f9]" />

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveBranding}
                    disabled={savingBranding}
                    className="bg-primary hover:bg-[#003366] text-white"
                  >
                    {savingBranding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Branding
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIVACY & GDPR TAB ── */}
          <TabsContent value="privacy" className="space-y-6 pt-8">

            {/* Self-service: Download Your Own Data (Figma hero) */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardContent className="px-6 py-8 sm:px-10 flex flex-col items-center text-center gap-3">
                <h2 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-8">
                  Download Your Personal Data
                </h2>
                <p className="text-[16px] text-[#404750] leading-[26px] max-w-[640px]">
                  Export your account data as a JSON file (GDPR Article 20). Your export includes: account details, vendor permissions, activity logs, and settings updates tied to your account.
                </p>
                <Button
                  className="mt-2 gap-2 bg-primary hover:bg-[#003366] text-white font-bold px-6 py-3 h-auto rounded-md"
                  disabled={exportingUserId === authContext.userId}
                  onClick={() => authContext.userId && handleExportUser(authContext.userId, "my-data")}
                >
                  {exportingUserId === authContext.userId
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />}
                  Download My Data
                </Button>
              </CardContent>
            </Card>

            {/* Export Data card — available to all admins with manage:users */}
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a] flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  User Data Export
                </CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">
                  Download all account data associated with a user as a JSON file (GDPR Article 20).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {privacyUsers.length === 0 ? (
                  <p className="text-sm text-[#94a3b8] p-6">No users found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#f1f5f9]">
                          <th className="text-left font-bold text-[#64748b] uppercase text-[12px] tracking-[0.6px] py-4 px-6">User</th>
                          <th className="text-left font-bold text-[#64748b] uppercase text-[12px] tracking-[0.6px] py-4 px-4">Role</th>
                          <th className="text-left font-bold text-[#64748b] uppercase text-[12px] tracking-[0.6px] py-4 px-4">Status</th>
                          <th className="text-left font-bold text-[#64748b] uppercase text-[12px] tracking-[0.6px] py-4 px-4">Joined Date</th>
                          <th className="text-right font-bold text-[#64748b] uppercase text-[12px] tracking-[0.6px] py-4 px-6">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {privacyUsers.map((u) => (
                          <tr key={u.userId} className="hover:bg-[#f8fafc]">
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">
                                  {(u.displayName || u.email).slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-[#0f172a]">{u.displayName || u.email}</p>
                                  <p className="text-[12px] text-[#64748b]">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#334155] capitalize">
                              {u.role.replace(/_/g, " ")}
                            </td>
                            <td className="py-3 px-4">
                              {u.status === "active" || !u.status ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d1fae5] text-[#065f46] text-[11px] font-medium px-2 py-0.5">
                                  <span className="size-1.5 rounded-full bg-[#10b981]" />Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f9] text-[#475569] text-[11px] font-medium px-2 py-0.5">
                                  <span className="size-1.5 rounded-full bg-[#94a3b8]" />Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#64748b]">
                              {u.joinedAt
                                ? new Date(u.joinedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                                : "—"}
                            </td>
                            <td className="py-3 px-6 text-right">
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-[#003366] text-white gap-1.5 rounded-[4px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] font-bold text-[12px]"
                                disabled={exportingUserId === u.userId}
                                onClick={() => handleExportUser(u.userId, u.email)}
                              >
                                {exportingUserId === u.userId
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Download className="h-3.5 w-3.5" />}
                                Export
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone — superadmin only */}
            {authContext.role === "superadmin" && (
              <Card className="rounded-[12px] border border-red-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                <CardHeader className="border-b border-red-100 pb-[25px] pt-6 px-6 bg-red-50">
                  <CardTitle className="text-[18px] font-bold text-red-700 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-[14px] text-red-600">
                    Permanently purge a user account — anonymises all PII and deletes vendor access. This cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {privacyUsers.filter((u) => u.userId !== authContext.userId).length === 0 ? (
                    <p className="text-sm text-[#94a3b8]">No other users to purge.</p>
                  ) : (
                    <div className="divide-y divide-[#f1f5f9]">
                      {privacyUsers
                        .filter((u) => u.userId !== authContext.userId)
                        .map((u) => (
                          <div key={u.userId} className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-sm font-medium text-[#0f172a]">{u.displayName || u.email}</p>
                              <p className="text-xs text-[#64748b]">{u.email} · <span className="capitalize">{u.role.replace("_", " ")}</span></p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setPurgeTarget(u)
                                setPurgeConfirmText("")
                                setPurgeDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Purge User
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Compliance — export / purge logging (Figma) */}
            <div className="flex items-start gap-3 rounded-[8px] border border-[#dbeafe] bg-[#eff6ff] p-[17px]">
              <Info className="size-5 text-[#1e40af] shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#1e40af] leading-5">
                Compliance logs are automatically generated for all data export and purge actions. These logs are stored for 7 years to meet regulatory requirements.
              </p>
            </div>
          </TabsContent>

          {/* ── COMMUNICATIONS TAB ── */}
          <TabsContent value="communications" className="pt-8 space-y-6">

            {/* Info banner — full width */}
            <div className="flex items-start gap-3 rounded-[12px] border border-[#bfdbfe] bg-[#eff6ff] px-5 py-4">
              <Info className="h-5 w-5 text-[#3b82f6] mt-0.5 shrink-0" />
              <p className="text-[14px] text-[#1e40af] leading-relaxed">
                Connect an email service provider in the <strong>Integrations</strong> tab to activate sending. Templates are saved and ready to use when connected.
              </p>
            </div>

            {/* 2-column grid: Email Templates (left) + Create Announcement (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* LEFT — Email Templates */}
              <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                  <CardTitle className="text-[18px] font-bold text-[#0f172a]">Email Templates</CardTitle>
                  <CardDescription className="text-[14px] text-[#64748b]">Customize the emails sent to your members.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-[#f1f5f9] p-0">
                  {(["onboarding", "reengagement"] as const).map((type) => {
                    const tpl = type === "onboarding" ? onboardingTemplate : reengagementTemplate
                    const label = type === "onboarding" ? "Welcome / Onboarding" : "Re-engagement"
                    const desc = type === "onboarding" ? "Sent when a new member joins" : "Sent to inactive members"
                    return (
                      <div key={type} className="flex items-start justify-between gap-4 px-6 py-5">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#0f172a]">{label}</p>
                          <p className="text-[12px] text-[#64748b] mt-0.5">{desc}</p>
                          <p className="text-[12px] text-[#334155] mt-1 truncate">Subject: {tpl.subject}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[13px]"
                            onClick={() => setPreviewTemplate(type)}
                          >
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[13px]"
                            onClick={() => { setEditingTemplate(type); setEditTemplateForm(tpl) }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* RIGHT — Create Announcement */}
              <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                  <CardTitle className="text-[18px] font-bold text-[#0f172a] flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Create Announcement
                  </CardTitle>
                  <CardDescription className="text-[14px] text-[#64748b]">Post a banner visible to all portal users. Banners appear at the top of every page until dismissed or expired.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">Title <span className="text-red-500">*</span></Label>
                    <Input
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="System maintenance window..."
                      className="border-[#cbd5e1]"
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">Message <span className="text-[#94a3b8] font-normal normal-case">(optional)</span></Label>
                    <textarea
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      rows={3}
                      placeholder="Describe the announcement details..."
                      className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">Priority</Label>
                      <select
                        value={announcementPriority}
                        onChange={(e) => setAnnouncementPriority(e.target.value as any)}
                        className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">Expires In</Label>
                      <select
                        value={announcementExpiry}
                        onChange={(e) => setAnnouncementExpiry(e.target.value as any)}
                        className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      >
                        <option value="1d">1 day</option>
                        <option value="3d">3 days</option>
                        <option value="7d">7 days</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-1">
                    <Button
                      onClick={handleCreateAnnouncement}
                      disabled={!announcementTitle.trim() || creatingAnnouncement}
                      className="w-full bg-primary hover:bg-[#003070] text-white"
                    >
                      {creatingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Post Announcement
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-4 w-4 text-[#94a3b8] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-[#334155]">Need help with communications?</p>
                      <p className="text-[12px] text-[#64748b] mt-0.5 leading-relaxed">
                        Check our documentation on managing email sequences and public announcements.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Purge Confirmation Dialog ── */}
      <Dialog open={purgeDialogOpen} onOpenChange={(open) => { setPurgeDialogOpen(open); if (!open) { setPurgeTarget(null); setPurgeConfirmText("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Confirm Account Purge
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                You are about to permanently purge <strong>{purgeTarget?.email}</strong>.
                All personal data will be anonymised and their vendor access removed.
              </span>
              <span className="block text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium text-[#334155]">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </Label>
            <Input
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-red-200 focus-visible:ring-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeDialogOpen(false)} disabled={purging}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurgeUser}
              disabled={purgeConfirmText !== "DELETE" || purging}
            >
              {purging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Purge Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Template Edit Dialog ── */}
      <Dialog open={editingTemplate !== null} onOpenChange={(open) => { if (!open) setEditingTemplate(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editingTemplate === "onboarding" ? "Welcome / Onboarding" : "Re-engagement"} Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Subject</Label>
              <Input
                value={editTemplateForm.subject}
                onChange={(e) => setEditTemplateForm((f) => ({ ...f, subject: e.target.value }))}
                className="border-[#cbd5e1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Preview Text</Label>
              <Input
                value={editTemplateForm.previewText}
                onChange={(e) => setEditTemplateForm((f) => ({ ...f, previewText: e.target.value }))}
                className="border-[#cbd5e1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Body</Label>
              <textarea
                value={editTemplateForm.bodyText}
                onChange={(e) => setEditTemplateForm((f) => ({ ...f, bodyText: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
              />
              <p className="text-[11px] text-[#94a3b8]">Use {"{{name}}"} for member name.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)} disabled={savingTemplate}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-[#003070] text-white"
              disabled={savingTemplate || !editTemplateForm.subject.trim()}
              onClick={() => editingTemplate && handleSaveTemplate(editingTemplate)}
            >
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Template Preview Dialog ── */}
      <Dialog open={previewTemplate !== null} onOpenChange={(open) => { if (!open) setPreviewTemplate(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (() => {
            const tpl = previewTemplate === "onboarding" ? onboardingTemplate : reengagementTemplate
            return (
              <div className="space-y-3 py-2">
                <div className="rounded-lg border border-[#e2e8f0] p-4 bg-[#f8fafc] space-y-1">
                  <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Subject</p>
                  <p className="text-[14px] font-medium text-[#0f172a]">{tpl.subject}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] p-4 bg-white">
                  <pre className="text-[13px] text-[#334155] whitespace-pre-wrap font-sans leading-relaxed">{tpl.bodyText}</pre>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── API Integration Configure/Connect Dialog ── */}
      <Dialog open={integrationDialogOpen} onOpenChange={(open) => { setIntegrationDialogOpen(open); if (!open) setIntegrationDialogKey("") }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {integrationDialogTarget === "usda"
                ? "USDA Food Data Central"
                : integrationDialogTarget === "nutrition_label"
                ? "Nutrition Label API"
                : "Compliance Checker"}
            </DialogTitle>
            <DialogDescription>
              Enter your API key to {isIntegrationConnected(
                integrationDialogTarget === "usda" ? usdaApiKey
                : integrationDialogTarget === "nutrition_label" ? nutritionLabelApiKey
                : complianceApiKey
              ) ? "update this" : "connect this"} integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-[14px] font-semibold text-[#334155]">API Key</Label>
            <Input
              type="password"
              placeholder="Enter API key..."
              value={integrationDialogKey}
              onChange={(e) => setIntegrationDialogKey(e.target.value)}
              className="font-mono border-[#cbd5e1]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationDialogOpen(false)} disabled={savingIntegration}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-[#003366] text-white"
              disabled={savingIntegration || !integrationDialogKey.trim()}
              onClick={handleSaveIntegration}
            >
              {savingIntegration ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
