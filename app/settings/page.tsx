"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
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
import { AlertTriangle, Copy, Database, Globe, Info, Key, Loader2, Plus, Shield, Trash2, User, Zap } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/backend"
import { useToast } from "@/hooks/use-toast"

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
  ipRestrictions: "pref.ip_restrictions",
  auditLogging: "pref.audit_logging",
} as const

// ── Role Permissions config (Figma design) ───────────────────────────────────
type RoleKey = "superadmin" | "vendor_admin" | "vendor_viewer"
const ROLE_CONFIG: {
  key: RoleKey
  label: string
  icon: "shield" | "user"
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
      { label: "Full system access", permKey: "*" },
      { label: "User management", permKey: "manage:users" },
      { label: "System settings", permKey: "manage:settings" },
      { label: "Data export", permKey: "read:audit" },
    ],
  },
  {
    key: "vendor_viewer",
    label: "User",
    icon: "user",
    permissions: [
      { label: "View products", permKey: "read:products" },
      { label: "View customers", permKey: "read:customers" },
      { label: "Edit products", permKey: "write:products" },
      { label: "Data export", permKey: "read:audit" },
    ],
  },
]

export default function SettingsPage() {
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
  const [ipRestrictions, setIpRestrictions] = useState(false)
  const [auditLogging, setAuditLogging] = useState(true)
  const [apiKeys, setApiKeys] = useState<{ id: string; key_prefix: string; label: string; environment: string; is_active: boolean }[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [generateKeyOpen, setGenerateKeyOpen] = useState(false)
  const [newKeyModal, setNewKeyModal] = useState<{ api_key: string; hmac_secret: string; environment: string } | null>(null)
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
    vendor_viewer: [],
  })
  const [rolePermissions, setRolePermissions] = useState<Record<RoleKey, Record<string, boolean>>>({
    superadmin: { "*": true, "manage:users": true, "manage:settings": true, "read:audit": true },
    vendor_admin: { "*": true, "manage:users": true, "manage:settings": true, "read:audit": true },
    vendor_viewer: { "read:products": true, "read:customers": true, "write:products": false, "read:audit": false },
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

  const EVENT_OPTIONS = [
    { value: "product.match.found", label: "Product Match Found" },
    { value: "import.completed", label: "Import Completed" },
    { value: "compliance.alert", label: "Compliance Alert" },
    { value: "customer.profile.updated", label: "Customer Profile Updated" },
    { value: "quality.score.low", label: "Quality Score Low" },
  ]

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
    if (!webhookUrl.trim()) return
    setWebhookSaving(true)
    try {
      const res = await apiFetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents, enabled: true }),
      })
      if (res.ok) {
        const json = await res.json()
        setWebhooks((prev) => [...prev, json.data])
        setWebhookUrl("")
        setWebhookEvents(["product.match.found", "import.completed"])
        toast({ title: "Webhook added", description: webhookUrl.trim() })
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
        if (map.has(SETTINGS_KEYS.ipRestrictions)) setIpRestrictions(map.get(SETTINGS_KEYS.ipRestrictions) === "true")
        if (map.has(SETTINGS_KEYS.auditLogging)) setAuditLogging(map.get(SETTINGS_KEYS.auditLogging) === "true")
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

      const viewerPerms = rolePermissions.vendor_viewer || {}
      const vendorViewerToSave = [
        ...(viewerPerms["read:products"] ? ["read:products"] : []),
        ...(viewerPerms["read:customers"] ? ["read:customers"] : []),
        ...(viewerPerms["write:products"] ? ["write:products"] : []),
        ...(viewerPerms["read:audit"] ? ["read:audit"] : []),
      ]

      const res = await apiFetch("/api/role-permissions", {
        method: "PUT",
        body: JSON.stringify({ role: "vendor_viewer", permissions: vendorViewerToSave }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.detail || "Failed to save permissions")
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
        saveSetting(SETTINGS_KEYS.ipRestrictions, String(ipRestrictions)),
        saveSetting(SETTINGS_KEYS.auditLogging, String(auditLogging)),
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

  const copyToClipboard = (text: string, label: string) => {
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
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Integrations
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Role Permissions
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Data & Storage
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] data-[state=active]:font-bold data-[state=inactive]:text-[#64748b] data-[state=inactive]:font-medium px-0 pb-5 pt-4"
            >
              Security
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
                    className="bg-[#00438f] hover:bg-[#003366] text-white px-6 py-[10px] text-[16px] font-bold rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
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
                    <Switch checked={autoMatching} onCheckedChange={setAutoMatching} className="data-[state=checked]:bg-[#00438f]" />
                  </div>
                  <div className="border-t border-[#f1f5f9] flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-[14px] font-bold text-[#0f172a]">Email Notifications</Label>
                      <p className="text-[12px] text-[#64748b]">Send system notifications via email</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} className="data-[state=checked]:bg-[#00438f]" />
                  </div>
                  <div className="border-t border-[#f1f5f9] flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-[14px] font-bold text-[#0f172a]">Data Retention</Label>
                      <p className="text-[12px] text-[#64748b]">Automatically archive old data after 2 years</p>
                    </div>
                    <Switch checked={dataRetention} onCheckedChange={setDataRetention} className="data-[state=checked]:bg-[#00438f]" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSavePrefs}
                    disabled={savingPrefs}
                    className="bg-[#00438f] hover:bg-[#003366] text-white px-6 py-[10px] text-[16px] font-bold rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
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
                <div className="flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[rgba(0,67,143,0.05)] flex items-center justify-center shrink-0">
                      <Globe className="h-6 w-6 text-[#00438f]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">USDA Food Data Central</h3>
                      <p className="text-[12px] text-[#64748b]">Nutrition data API integration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-[#10b981]" />
                      Connected
                    </span>
                    <Button className="border border-[rgba(0,67,143,0.2)] text-[#00438f] font-bold text-[14px] px-4 py-2 rounded-[8px] hover:bg-[#00438f]/5 bg-transparent">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="border-t border-[#f1f5f9] flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
                      <Database className="h-6 w-6 text-[#64748b]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">Nutrition Label API</h3>
                      <p className="text-[12px] text-[#64748b]">Automated label generation service</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="bg-[#f1f5f9] text-[#475569] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-[#94a3b8]" />
                      Disconnected
                    </span>
                    <Button className="bg-[#00438f] hover:bg-[#003366] text-white font-bold text-[14px] px-4 py-2 rounded-[8px]">
                      Connect
                    </Button>
                  </div>
                </div>
                <div className="border-t border-[#f1f5f9] flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[48px] rounded-[8px] bg-[rgba(0,67,143,0.05)] flex items-center justify-center shrink-0">
                      <Shield className="h-6 w-6 text-[#00438f]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-[#0f172a]">Compliance Checker</h3>
                      <p className="text-[12px] text-[#64748b]">Regulatory compliance validation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="bg-[#d1fae5] text-[#065f46] text-[12px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-[#10b981]" />
                      Connected
                    </span>
                    <Button className="border border-[rgba(0,67,143,0.2)] text-[#00438f] font-bold text-[14px] px-4 py-2 rounded-[8px] hover:bg-[#00438f]/5 bg-transparent">
                      Configure
                    </Button>
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
                                <span key={ev} className="text-[10px] bg-[#eff6ff] text-[#00438f] rounded px-1.5 py-0.5 font-medium">{ev}</span>
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
                              className="h-8 w-8 p-0 text-[#64748b] hover:text-[#00438f]"
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
                  <div className="space-y-3">
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
                        <Label htmlFor={`event-${opt.value}`} className="text-[14px] font-medium text-[#334155]">{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="!bg-[#00438f] hover:!bg-[#003366] text-white font-bold text-[16px] h-12 min-w-[180px] px-8 py-3 rounded-[12px]"
                  disabled={webhookSaving || !webhookUrl.trim()}
                  onClick={handleAddWebhook}
                >
                  {webhookSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-8 pt-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-[18px] font-bold text-[#0f172a]">Role Permissions</h2>
              <p className="text-[14px] text-[#64748b]">Configure permissions for different user roles within the portal.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                const isAdmin = role.icon === "shield"

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
                              isAdmin ? "bg-[rgba(0,67,143,0.1)]" : "bg-[#f1f5f9]"
                            }`}
                          >
                            {isAdmin ? (
                              <Shield className="h-5 w-5 text-[#00438f]" />
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
                                    ? "bg-[#e5ecf4] text-[#00438f]"
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
                              className="rounded-[4px] border-[#cbd5e1] data-[state=checked]:bg-[#00438f] data-[state=checked]:border-[#00438f] size-5"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="bg-[#00438f] hover:bg-[#003366] text-white font-bold text-[14px] px-8 py-3 rounded-[8px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
              >
                {savingPermissions ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Permissions
              </Button>
            </div>
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
                    <div className="h-full bg-[#00438f] rounded-full" style={{ width: "24%" }} />
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
                    className="data-[state=checked]:bg-[#00438f]"
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
                    className="data-[state=checked]:bg-[#00438f]"
                  />
                </div>
              </CardContent>
              <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-6 flex gap-3">
                <Button
                  className="bg-[#00438f] hover:bg-[#003366] text-white px-5 py-[11px] rounded-[8px]"
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
              <Info className="size-5 text-[#00438f] shrink-0 mt-0.5" />
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
                  <Switch checked={require2fa} onCheckedChange={setRequire2fa} className="data-[state=checked]:bg-[#00438f]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Session Timeout</Label>
                    <p className="text-[12px] text-[#64748b]">Auto-logout after 30 minutes of inactivity.</p>
                  </div>
                  <Switch checked={sessionTimeoutEnabled} onCheckedChange={setSessionTimeoutEnabled} className="data-[state=checked]:bg-[#00438f]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">IP Restrictions</Label>
                    <p className="text-[12px] text-[#64748b]">Limit access to specific IP addresses.</p>
                  </div>
                  <Switch checked={ipRestrictions} onCheckedChange={setIpRestrictions} className="data-[state=checked]:bg-[#00438f]" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[14px] font-bold text-[#0f172a]">Audit Logging</Label>
                    <p className="text-[12px] text-[#64748b]">Log all user actions and system events.</p>
                  </div>
                  <Switch checked={auditLogging} onCheckedChange={setAuditLogging} className="data-[state=checked]:bg-[#00438f]" />
                </div>
              </CardContent>
              <div className="bg-[#f8fafc] border-t border-[#f1f5f9] p-6 flex justify-end">
                <Button
                  className="bg-[#00438f] hover:bg-[#003366] text-white font-bold px-6 py-[10px] rounded-[8px]"
                  onClick={handleSaveSecuritySettings}
                  disabled={savingSecurity}
                >
                  {savingSecurity ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Security Settings
                </Button>
              </div>
            </Card>

            {/* API Keys card - second per Figma */}
            <Card className="rounded-[12px] border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                <CardTitle className="text-[18px] font-bold text-[#0f172a]">API Keys</CardTitle>
                <CardDescription className="text-[14px] text-[#64748b]">Manage API keys for external integrations.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {apiKeysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
                  </div>
                ) : (
                  <div className="space-y-0">
                    {["live", "test"].map((env) => {
                      const key = apiKeys.find((k) => k.environment === env)
                      const label = env === "live" ? "Production API Key" : "Development API Key"
                      const mask = env === "live" ? "nutri_live_••••••••••••••••" : "nutri_test_••••••••••••••••"
                      return (
                        <div
                          key={env}
                          className={`flex items-center justify-between py-6 ${env === "test" ? "border-t border-[#f1f5f9]" : ""}`}
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <Label className="text-[14px] font-bold text-[#0f172a]">{label}</Label>
                            <div className="flex items-center gap-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-[4px] px-3 py-2 w-fit">
                              <span className="font-mono text-[12px] text-[#334155] tracking-[0.6px]">
                                {key ? mask : "No key configured"}
                              </span>
                              {key && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(mask, "Key reference")}
                                  className="text-[#64748b] hover:text-[#0f172a] p-0.5"
                                  aria-label="Copy key reference"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 shrink-0">
                            {key ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#e2e8f0] text-[#334155] text-[12px] font-bold px-4 py-2 rounded-[8px]"
                                  onClick={() => handleGenerateKey(env as "live" | "test")}
                                >
                                  Regenerate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-[#fee2e2] text-[#dc2626] text-[12px] font-bold px-4 py-2 rounded-[8px] hover:bg-red-50"
                                  onClick={() => handleRevokeKey(key.id)}
                                >
                                  Revoke
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#e2e8f0] text-[#334155] text-[12px] font-bold px-4 py-2 rounded-[8px]"
                                onClick={() => handleGenerateKey(env as "live" | "test")}
                              >
                                Generate
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
              <div className="bg-[#f8fafc] border-t border-[#f1f5f9] p-6">
                <Button
                  variant="outline"
                  className="border-[#e2e8f0] bg-white text-[#0f172a] font-bold text-[14px] px-6 py-[11px] rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                  onClick={() => setGenerateKeyOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </div>
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
                    className="flex-1 bg-[#00438f] hover:bg-[#003366]"
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
                    className="bg-[#00438f] hover:bg-[#003366]"
                    onClick={() => setNewKeyModal(null)}
                  >
                    I have stored these securely
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
