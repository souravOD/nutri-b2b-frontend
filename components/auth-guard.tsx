"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { account, databases } from "@/lib/appwrite"
import { Query } from "appwrite"

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
])

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false

  const [ready, setReady] = React.useState(false)
  const ranRef = React.useRef(false) // avoid strict-mode double run in dev

  React.useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {
      try {
        if (isPublic) { setReady(true); return }

        // --- static env reads so Next inlines them in client bundle ---
        const DB_ID = `${process.env.NEXT_PUBLIC_APPWRITE_DB_ID ?? ""}`.trim()
        const USERPROFILES_COL = `${process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL ?? ""}`.trim()
        const BACKEND_BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}`.trim().replace(/\/+$/, "")
        if (!DB_ID || !USERPROFILES_COL) { setReady(true); return }

        // 1) authenticated & verified?
        const me = await account.get().catch(() => null)
        if (!me) { router.replace("/login"); return }
        if (!me.emailVerification && pathname !== "/verify") { router.replace("/verify"); return }

        // 2) has a profile?
        let hasProfile = await userProfileExists(DB_ID, USERPROFILES_COL, me.$id)

        // 3) if not, ask server to attach user to existing vendor/team (idempotent, no team creation)
        if (!hasProfile) {
          const attachKey = `attach-${me.$id}`
          if (sessionStorage.getItem(attachKey) !== "1") {
            sessionStorage.setItem(attachKey, "1")
            await fetch("/api/auth/complete-registration", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ userId: me.$id, email: me.email, fullName: me.name }),
            }).catch(() => {})
          }
          hasProfile = await userProfileExists(DB_ID, USERPROFILES_COL, me.$id)
          if (!hasProfile) { router.replace("/login?needs_admin_attach=1"); return }
        }

        // 4) 🔁 ONE-TIME SUPABASE SYNC (this is the missing piece)
        //    After profile exists, call backend /onboard/self with an Appwrite JWT
        //    so Supabase gets (users, user_links, users.vendor_id) upserted.
        const syncKey = `sb-sync-${me.$id}`
        if (sessionStorage.getItem(syncKey) !== "1" && BACKEND_BASE) {
          sessionStorage.setItem(syncKey, "1")
          try {
            const { jwt } = await account.createJWT()
            await fetch(`${BACKEND_BASE}/onboard/self`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${jwt}`,
                "X-Appwrite-JWT": jwt,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                userId: me.$id,       // <-- REQUIRED for fallback
                email: me.email,      // <-- verifies identity in fallback
                fullName: me.name,    // optional nice-to-have
              }),
            })
            // ignore response; endpoint is idempotent and might already have synced
          } catch {
            // don’t block UI if sync fails; dashboard will surface 403 if truly missing
          }
        }

        setReady(true)
      } catch {
        setReady(true) // fail-safe: don’t blank the UI
      }
    }

    run()
  }, [isPublic, pathname, router])

  if (isPublic) return <>{children}</>
  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>
  return <>{children}</>
}

async function userProfileExists(DB_ID: string, USERPROFILES_COL: string, userId: string) {
  try {
    const res = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
      Query.equal("user_id", userId),
      Query.limit(1),
    ])
    return res.total > 0
  } catch {
    return false
  }
}
