"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { account, databases } from "@/lib/appwrite"
import { Query } from "appwrite"

/**
 * OnboardingGate (safe, idempotent)
 * - Does NOT create teams or vendors.
 * - If user has no profile, asks the server to attach them based on email domain.
 * - Re-checks profile; if still missing, shows a helpful error and stops.
 *
 * Requires envs (Vercel/Local):
 *  - NEXT_PUBLIC_APPWRITE_DB_ID
 *  - NEXT_PUBLIC_APPWRITE_USERPROFILES_COL
 */
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

  // Harden env handling: fail fast if Vercel didn't inject real values
  function needEnv(name: string): string {
    const raw = (process.env as Record<string, string | undefined>)[name]
    const val = (raw ?? "").trim()
    if (!val || val === name) {
      throw new Error(`Missing/invalid ${name}. Set it in Vercel → Project → Environment Variables.`)
    }
    return val
  }
  const DB_ID = needEnv("NEXT_PUBLIC_APPWRITE_DB_ID")
  const USERPROFILES_COL = needEnv("NEXT_PUBLIC_APPWRITE_USERPROFILES_COL")

  React.useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {
      try {
        // 0) Must be logged in & verified
        const me = await account.get().catch(() => null)
        if (!me) { router.replace("/login"); return }
        if (!me.emailVerification) { router.replace("/verify"); return }

        setPhase("checking")
        setMessage("Checking your workspace…")

        // 1) Already has a profile?
        if (await hasUserProfile(DB_ID, USERPROFILES_COL, me.$id)) {
          setPhase("ready"); setMessage("Workspace is ready.")
          if (redirectOnDone) router.replace("/dashboard")
          return
        }

        // 2) Ask the server to attach (domain → vendor/team), idempotent and safe
        //    This route should map domain to existing vendor.team_id and ensure membership + user_profile.
        setPhase("creating")
        setMessage("Linking your account to your company…")
        try {
          await fetch("/api/auth/complete-registration", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              userId: me.$id,
              email: me.email,
              fullName: me.name,
            }),
          })
        } catch {
          /* ignore; we’ll re-check the profile next */
        }

        // 3) Re-check profile. If still missing, stop (do NOT create anything).
        if (await hasUserProfile(DB_ID, USERPROFILES_COL, me.$id)) {
          setPhase("ready"); setMessage("Workspace ready.")
          if (redirectOnDone) router.replace("/dashboard")
          return
        }

        setPhase("error")
        setMessage(
          "We couldn't find a vendor/team for your email domain. Ask an admin to add you, then sign in again."
        )
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
        {phase === "checking" && (message || "Preparing your workspace…")}
        {phase === "creating" && message}
        {phase === "ready" && message}
        {phase === "error" && <span className="text-destructive">{message}</span>}
      </div>
      {children}
    </>
  )
}

async function hasUserProfile(DB_ID: string, USERPROFILES_COL: string, userId: string) {
  try {
    const res = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
      Query.equal("user_id", userId),
      Query.limit(1),
    ])
    return res.total > 0
  } catch {
    // If this fails due to permissions/mis-env, treat as "no profile" so we don't create anything client-side.
    return false
  }
}
