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
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      if (isPublic) { setReady(true); return }

      // --- read envs with STATIC references (Next.js will inline these) ---
      const DB_ID = `${process.env.NEXT_PUBLIC_APPWRITE_DB_ID ?? ""}`.trim()
      const USERPROFILES_COL = `${process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL ?? ""}`.trim()

      if (!DB_ID || !USERPROFILES_COL) {
        setError(
          "Missing/invalid NEXT_PUBLIC_APPWRITE_DB_ID · Set NEXT_PUBLIC_APPWRITE_DB_ID and NEXT_PUBLIC_APPWRITE_USERPROFILES_COL in .env.local (and Vercel), then restart the dev server."
        )
        setReady(true)
        return
      }

      try {
        // 1) must be logged in & verified
        const me = await account.get().catch(() => null)
        if (!me) { router.replace("/login"); return }
        if (!me.emailVerification && pathname !== "/verify") { router.replace("/verify"); return }

        // 2) already has a profile?
        const hasProfile = await profileExists(DB_ID, USERPROFILES_COL, me.$id)

        if (!hasProfile) {
          // prevent spamming the server on every render
          if (sessionStorage.getItem("attach-done") !== "1") {
            sessionStorage.setItem("attach-done", "1")
            await fetch("/api/auth/complete-registration", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ userId: me.$id, email: me.email, fullName: me.name }),
            }).catch(() => {})
          }

          const attached = await profileExists(DB_ID, USERPROFILES_COL, me.$id)
          if (!attached) { router.replace("/login?needs_admin_attach=1"); return }
        }
      } catch (e: any) {
        // show a banner instead of blank page; app still renders
        setError(e?.message ?? "Auth check failed")
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    run()
    return () => { cancelled = true }
  }, [pathname, isPublic, router])

  if (isPublic) return <>{children}</>

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
        {/* still render children so the app isn't blocked */}
        <div className="mt-3">{children}</div>
      </div>
    )
  }

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>

  return <>{children}</>
}

/* ---------- helpers ---------- */

async function profileExists(DB_ID: string, USERPROFILES_COL: string, userId: string) {
  try {
    const res = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
      Query.equal("user_id", userId),
      Query.limit(1),
    ])
    return res.total > 0
  } catch {
    // treat as missing, but don't hard-fail UI
    return false
  }
}
