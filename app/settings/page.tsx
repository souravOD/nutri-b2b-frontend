"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Database, Globe, Key, Loader2, Settings, Shield, Users } from 'lucide-react'
import { apiFetch } from "@/lib/backend"

// ── Settings key constants ──────────────────────────────────────────────────
const SETTINGS_KEYS = {
  orgName: "org.name",
  orgDomain: "org.domain",
  orgTimezone: "org.timezone",
  autoMatching: "pref.auto_matching",
  emailNotifications: "pref.email_notifications",
  dataRetention: "pref.data_retention",
} as const

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("")
  const [orgDomain, setOrgDomain] = useState("")
  const [orgTimezone, setOrgTimezone] = useState("America/New_York")
  const [autoMatching, setAutoMatching] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [dataRetention, setDataRetention] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const successTimeoutRef = useRef<number | null>(null)

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
        if (map.has(SETTINGS_KEYS.orgDomain)) setOrgDomain(map.get(SETTINGS_KEYS.orgDomain)!)
        if (map.has(SETTINGS_KEYS.orgTimezone)) setOrgTimezone(map.get(SETTINGS_KEYS.orgTimezone)!)
        if (map.has(SETTINGS_KEYS.autoMatching)) setAutoMatching(map.get(SETTINGS_KEYS.autoMatching) === "true")
        if (map.has(SETTINGS_KEYS.emailNotifications)) setEmailNotifications(map.get(SETTINGS_KEYS.emailNotifications) === "true")
        if (map.has(SETTINGS_KEYS.dataRetention)) setDataRetention(map.get(SETTINGS_KEYS.dataRetention) === "true")
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
      await Promise.all([
        saveSetting(SETTINGS_KEYS.orgName, orgName),
        saveSetting(SETTINGS_KEYS.orgDomain, orgDomain),
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

  return (
    <AppShell title="Settings">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
          </div>
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

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="data">Data & Storage</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your organization name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDomain">Domain</Label>
                  <Input id="orgDomain" value={orgDomain} onChange={(e) => setOrgDomain(e.target.value)} placeholder="yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgTimezone">Default Timezone</Label>
                  <select id="orgTimezone" className="w-full p-2 border rounded-md" value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)}>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <Button onClick={handleSaveOrg} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
                <CardDescription>Configure system-wide behavior and defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-matching</Label>
                    <p className="text-sm text-muted-foreground">Automatically run product matching for new imports</p>
                  </div>
                  <Switch checked={autoMatching} onCheckedChange={setAutoMatching} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send system notifications via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Data Retention</Label>
                    <p className="text-sm text-muted-foreground">Automatically archive old data after 2 years</p>
                  </div>
                  <Switch checked={dataRetention} onCheckedChange={setDataRetention} />
                </div>
                <Button onClick={handleSavePrefs} disabled={savingPrefs}>
                  {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>Manage external API connections and webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">USDA Food Data Central</h3>
                        <p className="text-sm text-muted-foreground">Nutrition data API integration</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Connected</Badge>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Nutrition Label API</h3>
                        <p className="text-sm text-muted-foreground">Automated label generation service</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Disconnected</Badge>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">Compliance Checker</h3>
                        <p className="text-sm text-muted-foreground">Regulatory compliance validation</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Connected</Badge>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Configure webhook endpoints for real-time notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input id="webhookUrl" placeholder="https://your-app.com/webhook" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookEvents">Events</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="productMatch" defaultChecked />
                      <Label htmlFor="productMatch">Product Match Found</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="importComplete" defaultChecked />
                      <Label htmlFor="importComplete">Import Completed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="complianceAlert" />
                      <Label htmlFor="complianceAlert">Compliance Alert</Label>
                    </div>
                  </div>
                </div>
                <Button>Add Webhook</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Active Users</h3>
                    <p className="text-sm text-muted-foreground">Manage users via the User Management page</p>
                  </div>
                  <Button onClick={() => window.location.href = "/user-management"}>Go to User Management</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data & Storage</CardTitle>
                <CardDescription>Monitor data usage and storage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Products</span>
                    <span className="text-sm text-muted-foreground">Storage managed by Supabase</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CSV Uploads</span>
                    <span className="text-sm text-muted-foreground">Files stored in Supabase Storage</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audit Logs</span>
                    <span className="text-sm text-muted-foreground">Retained indefinitely</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access keys for external integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <span className="font-mono text-sm">b2b_prod_****7x9k</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Production API Key</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Active</Badge>
                    <Button variant="outline" size="sm">Revoke</Button>
                  </div>
                </div>
                <Button>Generate New Key</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-base">Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                  <select className="w-full p-2 border rounded-md">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="480">8 hours</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
