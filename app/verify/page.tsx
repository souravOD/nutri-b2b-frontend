"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { account, databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Button } from "@/components/ui/button"
import AuthLayout from "@/components/auth/AuthLayout"

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!

export default function VerifyPage() {
  const router = useRouter()
  const params = useSearchParams()

  const [status, setStatus] = React.useState<"idle" | "verifying" | "waiting" | "error">("waiting")
  const [message, setMessage] = React.useState<string>(
    "We sent you a verification link. Open it in your email, then click Continue."
  )

  // Handle Appwrite callback (?userId=&secret=) exactly once
  React.useEffect(() => {
    const userId = params.get("userId")
    const secret = params.get("secret")
    if (!userId || !secret) {
      setStatus("waiting")
      return
    }

    let cancelled = false
    ;(async () => {
      setStatus("verifying")
      try {
        await account.updateVerification(userId, secret)
        await afterVerifiedRedirect(router)
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error")
          setMessage(err?.message ?? "Email verification failed. Try again from the email link.")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, router])

  async function onContinue() {
    setStatus("verifying")
    try {
      const me = await account.get().catch(() => null)
      const isVerified =
        !!me && ((me as any).emailVerification === true || (me as any).emailVerification === 1)

      if (!isVerified) {
        setStatus("waiting")
        setMessage("Still not verified. Open the link in your email, then click Continue.")
        return
      }

      await afterVerifiedRedirect(router)
    } catch (e: any) {
      setStatus("error")
      setMessage(e?.message ?? "Could not complete verification.")
    }
  }

  return (
    <AuthLayout
      title={
        status === "verifying"
          ? "Completing verification…"
          : status === "error"
          ? "Verification error"
          : "Verify your email"
      }
      subtitle={message}
    >
      {status !== "verifying" && (
        <div className="flex gap-3">
          <Button onClick={onContinue}>I’ve verified, continue</Button>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Go to login
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}

/** After verified: attach to vendor/team, then route (NO onboarding fallback for employees) */
async function afterVerifiedRedirect(router: ReturnType<typeof useRouter>) {
  try {
    const me = await account.get()

    // Attach to vendor/team via server (domain → vendor.domains → vendor.team_id)
    const resp = await fetch("/auth/complete-registration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: me.$id, email: me.email, fullName: me.name }),
    })

    if (!resp.ok) {
      // Do NOT send employees to onboarding; that would create a new team.
      return router.replace("/login?vendor_match_failed=1")
    }

    // If user_profile exists => dashboard; else ask admin to attach
    const profs = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
      Query.equal("user_id", me.$id),
      Query.limit(1),
    ])

    return router.replace(profs.total > 0 ? "/dashboard" : "/login?needs_admin_attach=1")
  } catch {
    // No session or other error — do not go to onboarding
    return router.replace("/login?vendor_match_failed=1")
  }
}
