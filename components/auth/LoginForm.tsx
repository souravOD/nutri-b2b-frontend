"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { account } from "@/lib/appwrite"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const verified = sp.get("verified") === "1" // gentle hint only

  // We will use the central AuthProvider's signIn, which
  // creates the session, syncs Supabase, and refreshes context

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      router.replace("/dashboard")
    } catch (err: any) {
      const code = err?.code ?? err?.response?.code
      let msg = "We couldn’t sign you in. Please try again."
      if (code === 401) {
        msg = "We couldn’t sign you in with that email and password."
      } else if (code === 429) {
        msg = "Too many attempts. Please wait a moment and try again."
      } else if (code === 0 || code === 502 || code === 503) {
        msg = "Can’t reach the server right now. Please try again shortly."
      } else if (typeof err?.message === "string" && err.message.includes("SDK build")) {
        msg = "Email/password sign-in isn’t available with this SDK build."
      }
      setError(msg) // inline, accessible — no toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {verified && !error ? (
        <InlineNote className="text-emerald-700 border-emerald-200 bg-emerald-50">
          Email verified. Please sign in to continue.
        </InlineNote>
      ) : null}

      {error ? (
        <InlineNote role="alert" className="text-red-700 border-red-200 bg-red-50">
          {error}
        </InlineNote>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <a href="/reset-password" className="text-xs text-muted-foreground underline hover:text-foreground">
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Don’t have an account? <a className="underline" href="/register">Create one</a>
      </p>
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"/>
    </svg>
  )
}
