"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { account, ID } from "@/lib/appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
function strongPassword(pw: string) {
  return pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)
}

// Compat helper for different Appwrite SDK versions
async function createEmailPasswordSession(email: string, password: string) {
  const a: any = account
  if (typeof a.createEmailSession === "function") {
    // v13+
    return a.createEmailSession(email, password)
  }
  if (typeof a.createEmailPasswordSession === "function") {
    // some newer typings
    return a.createEmailPasswordSession(email, password)
  }
  if (typeof a.createSession === "function") {
    // older SDKs
    return a.createSession(email, password)
  }
  throw new Error("This Appwrite SDK doesn't expose an email/password session method.")
}

export default function RegisterEmployeeForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)
  const [acceptTerms, setAcceptTerms] = React.useState(false)
  const [acceptDpa, setAcceptDpa] = React.useState(false)
  const [working, setWorking] = React.useState(false)

  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify`
      : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001") + "/verify"

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return toast({ title: "Enter your full name", variant: "destructive" })
    if (!validEmail(email)) return toast({ title: "Enter a valid work email", variant: "destructive" })
    if (!strongPassword(password)) {
      return toast({
        title: "Weak password",
        description: "Use 12+ chars with upper, lower, number & symbol.",
        variant: "destructive",
      })
    }
    if (!acceptTerms || !acceptDpa) {
      return toast({ title: "Please accept Terms and DPA", variant: "destructive" })
    }

    try {
      setWorking(true)

      // 1) Create user
      await account.create(ID.unique(), email, password, fullName)

      // 2) Create a session (required for createVerification)
      await createEmailPasswordSession(email, password)

      // 3) Send verification email
      await (account as any).createVerification(redirectUrl)

      toast({ title: "Verify your email", description: "We sent you a verification link." })

      // 4) Go to /verify
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err?.message ?? "Could not create account",
        variant: "destructive",
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby="pwHelp"
          />
          <Button type="button" variant="outline" onClick={() => setShowPw((s) => !s)}>
            {showPw ? "Hide" : "Show"}
          </Button>
        </div>
        <p id="pwHelp" className="text-xs text-muted-foreground">
          12+ chars incl. upper, lower, number & symbol.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(Boolean(v))} />
          <Label htmlFor="terms">I agree to the <a className="underline" href="/terms" target="_blank">Terms</a></Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="dpa" checked={acceptDpa} onCheckedChange={(v) => setAcceptDpa(Boolean(v))} />
          <Label htmlFor="dpa">I agree to the <a className="underline" href="/dpa" target="_blank">DPA</a></Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={working}>
        {working ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="underline underline-offset-4">Log in</Link>
      </p>
    </form>
  )
}
