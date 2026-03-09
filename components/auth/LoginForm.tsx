"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

export default function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [rememberDevice, setRememberDevice] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const verified = sp.get("verified") === "1"
  const authError = sp.get("auth_error")
  const needsAdminAttach = sp.get("needs_admin_attach") === "1"
  const vendorMatchFailed = sp.get("vendor_match_failed") === "1"

  const authErrorMessage = React.useMemo(() => {
    if (needsAdminAttach) {
      return "Your account is in Appwrite but not attached to a vendor profile yet. Ask your admin to attach your account."
    }
    if (vendorMatchFailed) {
      return "We could not match your account to a vendor/team. Contact your admin."
    }
    if (authError === "vendor_not_provisioned") {
      return "Your account is not provisioned in Supabase for any vendor. Ask your admin to pre-provision your vendor."
    }
    if (authError === "vendor_team_mismatch") {
      return "Your vendor mapping is inconsistent between Appwrite team/profile/domain. Ask your admin to fix vendor mapping."
    }
    if (authError === "user_not_linked") {
      return "Your account exists but is not linked in Supabase. Ask your admin to complete onboarding."
    }
    if (authError === "identity_conflict") {
      return "This email is linked to a different Appwrite identity. Ask your admin to resolve identity conflict."
    }
    if (authError === "invalid_token") {
      return "Your session is invalid or expired. Please sign in again."
    }
    if (authError === "backend_unreachable") {
      return "Could not verify provisioning from backend. Please try again shortly."
    }
    if (authError === "onboarding_failed") {
      return "Provisioning check failed. Please contact support."
    }
    if (authError) {
      return `Access blocked: ${authError}.`
    }
    return null
  }, [authError, needsAdminAttach, vendorMatchFailed])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      router.replace("/dashboard")
    } catch (err: any) {
      // AppwriteException: code = HTTP status, type = e.g. "user_invalid_credentials"
      const code = err?.code ?? err?.response?.code
      const type = String(err?.type ?? "").toLowerCase()
      const errMsg = String(err?.message ?? "")

      if (process.env.NODE_ENV === "development") {
        console.error("[Login] Auth error:", { code, type, message: errMsg, err })
      }

      let msg = "We couldn't sign you in. Please try again."
      if (code === 401 || type.includes("invalid_credentials") || type.includes("user_invalid")) {
        msg = "We couldn't sign you in with that email and password."
      } else if (code === 429 || type.includes("rate_limit")) {
        msg = "Too many attempts. Please wait a moment and try again."
      } else if (code === 0 || code === 502 || code === 503) {
        msg = "Can't reach the server right now. Please try again shortly."
      } else if (errMsg.includes("opaque") || errMsg.toLowerCase().includes("cors")) {
        msg = "Could not connect to the auth server. Check that your Appwrite project allows this origin (CORS)."
      } else if (errMsg.includes("SDK build")) {
        msg = "Email/password sign-in isn't available with this SDK build."
      } else if (errMsg.includes("Invalid endpoint") || errMsg.includes("Invalid URL")) {
        msg = "Auth server URL is misconfigured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT."
      } else if (errMsg && errMsg.length < 120 && !errMsg.includes("fetch")) {
        msg = errMsg
      }
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-[20px]">
      {verified && !error ? (
        <InlineNote className="text-emerald-700 border-emerald-200 bg-emerald-50">
          Email verified. Please sign in to continue.
        </InlineNote>
      ) : null}

      {authErrorMessage && !error ? (
        <InlineNote role="alert" className="text-amber-800 border-amber-300 bg-amber-50">
          {authErrorMessage}
        </InlineNote>
      ) : null}

      {error ? (
        <InlineNote role="alert" className="text-red-700 border-red-200 bg-red-50">
          {error}
        </InlineNote>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email" className="font-semibold text-[#334155] text-sm">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-[#cbd5e1] rounded-lg h-12"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="font-semibold text-[#334155] text-sm">
            Password
          </Label>
          <a
            href="/reset-password"
            className="text-[12px] font-medium text-[#00438f] hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className="border-[#cbd5e1] rounded-lg h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#334155]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="remember"
          checked={rememberDevice}
          onCheckedChange={(c) => setRememberDevice(c === true)}
          className="rounded border-[#cbd5e1]"
        />
        <Label
          htmlFor="remember"
          className="font-normal text-[14px] text-[#475569] cursor-pointer"
        >
          Remember this device
        </Label>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-lg bg-[#00438f] hover:bg-[#003366] text-white font-bold text-base shadow-sm"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="border-t border-[#f1f5f9] pt-6">
        <p className="text-center text-sm text-[#475569]">
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="font-bold text-[#0067a0] hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </form>
  )
}

function InlineNote({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn("rounded-md border px-3 py-2 text-sm", className)}>
      {children}
    </div>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
    </svg>
  )
}
