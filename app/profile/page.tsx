"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Card } from "@/components/ui/card"
import { apiFetch } from "@/lib/backend"

const DEFAULT_TZ = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"]

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
      ; (async () => {
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
          country: country.trim() || null,
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
        <div className="grid gap-4 max-w-2xl">
          <div className="h-24 rounded bg-muted animate-pulse" />
          <div className="h-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Your profile</h1>

      <form onSubmit={onSave} className="grid max-w-2xl gap-6">
        <Card className="p-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" value={email} disabled />
          </div>

          {role && (
            <div className="grid gap-2">
              <Label>Role</Label>
              <Input value={role.replace(/_/g, " ")} disabled className="capitalize" />
            </div>
          )}
        </Card>

        <Card className="p-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15551234567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="country">Country ISO-2 (optional)</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="US"
                maxLength={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone (IANA, optional)</Label>
              <Input
                id="timezone"
                list="tz-list"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
              />
              <datalist id="tz-list">
                {timezones.slice(0, 300).map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.refresh()}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
