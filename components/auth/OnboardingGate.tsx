"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { account, databases, teams, ID } from "@/lib/appwrite"
import { Permission, Role, Query } from "appwrite"

export default function OnboardingGate({
  children,
  redirectOnDone = false,
}: {
  children: React.ReactNode
  redirectOnDone?: boolean
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<"checking" | "creating" | "ready" | "error">("checking")
  const [message, setMessage] = React.useState<string>("")
  const ranRef = React.useRef(false)

  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID?.trim()
  const VENDORS_COL = process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL?.trim()
  const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL?.trim()
  const UID = /^[A-Za-z0-9][A-Za-z0-9_]{0,35}$/
  function need(v?: string | null, name?: string) {
    if (!v) throw new Error(`Missing ${name}`)
    if (!UID.test(v)) throw new Error(`Misconfigured ${name}: ${v}`)
    return v
  }

  React.useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {
      try {
        const DB  = need(DB_ID, "NEXT_PUBLIC_APPWRITE_DB_ID")
        const VEN = need(VENDORS_COL, "NEXT_PUBLIC_APPWRITE_VENDORS_COL")
        const PRO = need(USERPROFILES_COL, "NEXT_PUBLIC_APPWRITE_USERPROFILES_COL")

        const me = await account.get().catch(() => null)
        if (!me) { router.replace("/login"); return }
        if (!me.emailVerification) { router.replace("/verify"); return }

        setPhase("checking")
        setMessage("Checking your workspace…")

        // already onboarded?
        try {
          const profs = await databases.listDocuments(DB, PRO, [Query.equal("user_id", me.$id), Query.limit(1)])
          if (profs.total > 0) {
            setPhase("ready"); setMessage("Workspace is ready.")
            if (redirectOnDone) router.replace("/dashboard")
            return
          }
        } catch {/* continue if perms fail */}

        // Pull pending vendor data (from RegisterForm)
        const raw = typeof window !== "undefined" ? localStorage.getItem("pendingVendor") : null
        const pending = raw ? JSON.parse(raw) as {
          name?: string; slug?: string; billingEmail?: string; phone?: string; country?: string; timezone?: string;
        } : {}

        const vendorName = pending.name?.trim() || (me.name ? `${me.name}'s Org` : "New Organization")
        const baseSlug = (pending.slug?.trim()
          || vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        ).slice(0, 32) || "org"

        setPhase("creating")
        setMessage("Creating team…")
        const teamId = ID.unique()
        await teams.create(teamId, vendorName)

        // Invite (best-effort)
        try {
          const url = typeof window !== "undefined" ? window.location.origin + "/onboarding" : ""
          // @ts-ignore signatures vary
          await teams.createMembership(teamId, ["admin"], url, me.email)
        } catch {/* ignore */}

        // Create vendor doc (handle slug conflict)
        setMessage("Creating workspace record…")
        let vendorDoc: any = null
        for (let n = 0; n < 20; n++) {
          const slug = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`
          try {
            vendorDoc = await databases.createDocument(
              DB, VEN, ID.unique(),
              {
                name: vendorName,
                slug,
                billing_email: pending.billingEmail || me.email,
                owner_user_id: me.$id,
                status: "active",
                created_at: new Date().toISOString(),
                team_id: teamId,
                phone: pending.phone ?? null,
                country: pending.country ?? null,
                timezone: pending.timezone ?? null,
              },
              [
                Permission.read(Role.team(teamId)),
                Permission.update(Role.team(teamId)),
                Permission.delete(Role.team(teamId)),
                Permission.read(Role.user(me.$id)),
                Permission.update(Role.user(me.$id)),
              ]
            )
            break
          } catch (e: any) {
            const code = e?.code ?? e?.response?.code
            if (code === 409) continue // unique slug retry
            if (code === 401 || code === 403) {
              throw new Error(`Not authorized to create in "${VEN}". In Appwrite Console → Database → "${DB}" → "${VEN}" → Permissions → enable Create → users.`)
            }
            if (String(e?.message || "").includes("Unknown attribute")) {
              throw new Error(`"${VEN}" schema missing attributes (status, team_id, created_at, …). Add them and reload.`)
            }
            throw e
          }
        }
        if (!vendorDoc) throw new Error("Could not create a unique workspace slug. Try a different company name.")

        setMessage("Linking your profile…")
        try {
          await databases.createDocument(
            DB, PRO, ID.unique(),
            {
              user_id: me.$id,
              vendor_id: vendorDoc.$id,
              full_name: me.name,
              role: "admin",
              created_at: new Date().toISOString(),
            },
            [
              Permission.read(Role.user(me.$id)),
              Permission.update(Role.user(me.$id)),
              Permission.read(Role.team(teamId)),
              Permission.update(Role.team(teamId)),
            ]
          )
        } catch (e: any) {
          const code = e?.code ?? e?.response?.code
          if (code === 401 || code === 403) {
            throw new Error(`Not authorized to create in "${PRO}". In Appwrite Console → Database → "${DB}" → "${PRO}" → Permissions → enable Create → users.`)
          }
          if (String(e?.message || "").includes("Unknown attribute")) {
            throw new Error(`"${PRO}" schema missing required attributes (user_id, vendor_id, full_name, role, created_at).`)
          }
          throw e
        }

        if (typeof window !== "undefined") localStorage.removeItem("pendingVendor")
        setPhase("ready"); setMessage("Workspace ready.")
        if (redirectOnDone) router.replace("/dashboard")
      } catch (e: any) {
        setPhase("error")
        setMessage(e?.message ?? "Onboarding failed")
      }
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div role="status" aria-live="polite" className="mb-3 text-xs text-muted-foreground">
        {phase === "checking" && "Preparing your workspace…"}
        {phase === "creating" && message}
        {phase === "ready" && message}
        {phase === "error" && <span className="text-destructive">{message}</span>}
      </div>
      {children}
    </>
  )
}
