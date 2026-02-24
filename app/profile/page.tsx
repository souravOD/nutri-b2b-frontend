"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { account, databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Card } from "@/components/ui/card"

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!
const VENDORS_COL = process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL!

type ProfileDoc = {
  $id: string
  user_id: string
  vendor_id: string
  vendor_slug?: string
  team_id?: string
  full_name: string
  role: string
  // Optional (only if you later add these attributes to the collection)
  phone?: string
  country?: string
  timezone?: string
}

type VendorDoc = {
  $id: string
  name: string
  slug: string
  billing_email?: string
}

async function resolveVendorFromProfile(profile: ProfileDoc): Promise<VendorDoc | null> {
  const vendorId = String(profile?.vendor_id ?? "").trim()
  const vendorSlug = String(profile?.vendor_slug ?? "").trim().toLowerCase()

  if (vendorId) {
    try {
      const byId = await databases.getDocument(DB_ID, VENDORS_COL, vendorId)
      return byId as unknown as VendorDoc
    } catch {
      // Fall through to slug lookup for legacy rows where vendor_id stored slug.
    }
  }

  const slugCandidate = vendorSlug || vendorId.toLowerCase()
  if (!slugCandidate) return null

  try {
    const bySlug = await databases.listDocuments(DB_ID, VENDORS_COL, [
      Query.equal("slug", slugCandidate),
      Query.limit(1),
    ])
    if (bySlug.total > 0) return bySlug.documents[0] as unknown as VendorDoc
  } catch {
    // Ignore and return null below.
  }

  return null
}

const DEFAULT_TZ = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"]

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // account
  const [userId, setUserId] = React.useState<string>("")
  const [email, setEmail] = React.useState<string>("")
  const [fullName, setFullName] = React.useState<string>("")

  // extendables (stored in DB if attributes exist; otherwise in prefs as fallback)
  const [phone, setPhone] = React.useState<string>("")
  const [country, setCountry] = React.useState<string>("")
  const [timezone, setTimezone] = React.useState<string>("")

  // vendor (read-only)
  const [vendor, setVendor] = React.useState<VendorDoc | null>(null)

  // user_profile doc
  const [profile, setProfile] = React.useState<ProfileDoc | null>(null)

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
        const me = await account.get()
        if (!me) throw new Error("Not authenticated")
        if (cancelled) return

        setUserId(me.$id)
        setEmail(me.email)
        setFullName(me.name ?? "")

        // Load user_profile
        const profs = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
          Query.equal("user_id", me.$id),
          Query.limit(1),
        ])

        if (cancelled) return

        if (profs.total > 0) {
          const p = profs.documents[0] as unknown as ProfileDoc
          setProfile(p)
          setFullName(p.full_name ?? me.name ?? "")
          setPhone((p as any).phone ?? "")
          setCountry((p as any).country ?? "")
          setTimezone((p as any).timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"))

          // Load vendor read-only info.
          const vend = await resolveVendorFromProfile(p)
          if (!cancelled && vend) setVendor(vend)
        } else {
          // No profile yet; keep minimal info
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
        }
      } catch (err) {
        // No session → go to login
        router.replace("/login")
        return
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
    if (!fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      // Update Appwrite account display name
      await account.updateName(fullName)

      // Upsert to user_profiles (full_name always; others only if the collection has those attributes)
      if (profile?.$id) {
        // Attempt to update everything; if schema lacks fields, Appwrite will error — we catch and retry minimal
        try {
          await databases.updateDocument(DB_ID, USERPROFILES_COL, profile.$id, {
            full_name: fullName,
            ...(phone ? { phone } : {}),
            ...(country ? { country } : {}),
            ...(timezone ? { timezone } : {}),
          })
        } catch {
          // Retry with minimal payload (safe for current schema)
          await databases.updateDocument(DB_ID, USERPROFILES_COL, profile.$id, {
            full_name: fullName,
          })
          // Persist optional fields in user prefs as a temporary fallback
          try {
            const currentPrefs = (await account.getPrefs()) as Record<string, any>
            await account.updatePrefs({
              ...currentPrefs,
              profile_ext: { phone, country, timezone },
            })
          } catch {
            // ignore
          }
        }
      }

      toast({ title: "Profile updated" })
    } catch (err: any) {
      toast({
        title: "Couldn’t save profile",
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

          {vendor && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input value={vendor.name} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Workspace slug</Label>
                <Input value={vendor.slug} disabled />
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
