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

type Errors = Partial<Record<
  | "fullName"
  | "email"
  | "password"
  | "company"
  | "slug"
  | "billingEmail"
  | "inviteCode"
  | "phone"
  | "country"
  | "timezone"
  | "acceptTerms"
  | "acceptDpa"
, string>>

const RESERVED_SLUGS = new Set(["admin","dashboard","login","register","profile","settings","api","customers","products","jobs","alerts","search"])

function slugify(src: string) {
  return src
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
}

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function strongPasswordPasses(pw: string, email: string, name: string) {
  if (!pw || pw.length < 12) return false
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasNum   = /\d/.test(pw)
  const hasSym   = /[^A-Za-z0-9]/.test(pw)
  const lowered  = pw.toLowerCase()
  if (email && lowered.includes(email.split("@")[0]?.toLowerCase())) return false
  if (name && lowered.includes(name.toLowerCase())) return false
  return hasUpper && hasLower && hasNum && hasSym
}

function validate(form: {
  fullName: string
  email: string
  password: string
  company: string
  slug: string
  billingEmail?: string
  inviteCode?: string
  phone?: string
  country?: string
  timezone?: string
  acceptTerms: boolean
  acceptDpa: boolean
}): Errors {
  const errs: Errors = {}
  if (!form.fullName || form.fullName.trim().length < 2) errs.fullName = "Enter your full name"
  if (!validEmail(form.email)) errs.email = "Enter a valid work email"
  if (!strongPasswordPasses(form.password, form.email, form.fullName)) {
    errs.password = "Use 12+ chars with upper, lower, number & symbol; avoid name/email"
  }
  if (!form.company || form.company.trim().length < 2) errs.company = "Enter your company name"
  if (!/^[a-z0-9-]{3,32}$/.test(form.slug) || /^-|-$/.test(form.slug) || RESERVED_SLUGS.has(form.slug)) {
    errs.slug = "3–32 chars, a–z, 0–9, hyphen; no leading/trailing hyphen; not reserved"
  }
  if (form.billingEmail && !validEmail(form.billingEmail)) errs.billingEmail = "Enter a valid billing email"
  if (form.phone && !/^\+\d{6,15}$/.test(form.phone)) errs.phone = "Use E.164 format, e.g. +15551234567"
  if (form.country && !/^[A-Za-z]{2}$/.test(form.country)) errs.country = "Use 2-letter country code (e.g. US)"
  if (form.timezone && form.timezone.length < 3) errs.timezone = "Use a valid IANA TZ (e.g. America/New_York)"
  if (!form.acceptTerms) errs.acceptTerms = "You must accept the Terms"
  if (!form.acceptDpa) errs.acceptDpa = "You must accept the DPA"
  return errs
}

export default function RegisterForm({ vendor }: { vendor?: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)

  const [company, setCompany] = React.useState("")
  const [slug, setSlug] = React.useState("")

  const [billingEmail, setBillingEmail] = React.useState("")
  const [inviteCode, setInviteCode] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [timezone, setTimezone] = React.useState("")

  const [acceptTerms, setAcceptTerms] = React.useState(false)
  const [acceptDpa, setAcceptDpa] = React.useState(false)

  const [errors, setErrors] = React.useState<Errors>({})
  const [working, setWorking] = React.useState(false)

  React.useEffect(() => {
    if (!company) return setSlug("")
    setSlug((prev) => (prev ? prev : slugify(company)))
  }, [company])

  React.useEffect(() => {
    if (!billingEmail) setBillingEmail(email.toLowerCase())
  }, [email]) // eslint-disable-line

  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify`
      : "https://example.com/verify"

  async function createSessionUniversal(email: string, password: string) {
    const acc: any = account as any
    if (typeof acc.createEmailPasswordSession === "function") {
      return acc.createEmailPasswordSession(email, password)    // newer SDK
    }
    if (typeof acc.createEmailSession === "function") {
      return acc.createEmailSession(email, password)            // older SDK
    }
    throw new Error("No compatible Appwrite login method found")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const form = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      company: company.trim(),
      slug: slug.trim(),
      billingEmail: billingEmail.trim(),
      inviteCode: inviteCode.trim(),
      phone: phone.trim(),
      country: country.trim(),
      timezone: timezone.trim(),
      acceptTerms,
      acceptDpa,
    }

    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    try {
      setWorking(true)

      // 1) Create account
      await account.create(ID.unique(), form.email, form.password, form.fullName)

      // 2) Kick off email verification
      await account.createVerification(redirectUrl)

      toast({
        title: "Account created",
        description: "We've sent you a verification email. Please verify to continue.",
      })

      // 3) Optional: take them to /verify (keeps your existing flow)
      router.push(`/verify?email=${encodeURIComponent(form.email)}`)
    } catch (err: any) {
      const code = err?.code ?? err?.response?.code
      const msg  = err?.message ?? ""

      if (code === 409 || /exist/i.test(msg)) {
        // ✅ Friendly duplicate-account UX (inline + toast with Login link)
        setErrors((prev) => ({ ...prev, email: "This email is already registered. Try logging in instead." }))

        toast({
          title: "Account already exists",
          description: (
            <span>
              An account with <span className="font-medium">{form.email}</span> already exists.{" "}
              <Link href="/login" className="underline underline-offset-4">Log in</Link>
              {" "}instead.
            </span>
          ),
        })
        return
      }

      // Fallback error
      toast({
        title: "Registration failed",
        description: msg || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" role="form" aria-label="Create account">
      {/* Full name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      {/* Password */}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? "Hide" : "Show"}
          </Button>
        </div>
        <p id="pwHelp" className="text-xs text-muted-foreground">
          12+ chars incl. upper, lower, number & symbol. Avoid your name/email.
        </p>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      {/* Company + Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company / Organization</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
          {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Workspace slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
        </div>
      </div>

      {/* Billing + Invite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billingEmail">Billing email (optional)</Label>
          <Input id="billingEmail" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
          {errors.billingEmail && <p className="text-xs text-destructive">{errors.billingEmail}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="inviteCode">Invite code (optional)</Label>
          <Input id="inviteCode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          {errors.inviteCode && <p className="text-xs text-destructive">{errors.inviteCode}</p>}
        </div>
      </div>

      {/* Phone + Country + TZ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (E.164, optional)</Label>
          <Input id="phone" placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (ISO-2, optional)</Label>
          <Input id="country" placeholder="US" value={country} onChange={(e) => setCountry(e.target.value)} />
          {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone (IANA, optional)</Label>
          <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/New_York" />
          {errors.timezone && <p className="text-xs text-destructive">{errors.timezone}</p>}
        </div>
      </div>

      {/* Agreements */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(Boolean(v))} />
          <Label htmlFor="terms">
            I agree to the <a className="underline" href="/terms" target="_blank" rel="noreferrer">Terms</a>
          </Label>
        </div>
        {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms}</p>}
        <div className="flex items-center gap-2">
          <Checkbox id="dpa" checked={acceptDpa} onCheckedChange={(v) => setAcceptDpa(Boolean(v))} />
          <Label htmlFor="dpa">
            I agree to the <a className="underline" href="/dpa" target="_blank" rel="noreferrer">DPA</a>
          </Label>
        </div>
        {errors.acceptDpa && <p className="text-xs text-destructive">{errors.acceptDpa}</p>}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button type="submit" className="w-full" disabled={working}>
          {working ? "Creating account…" : "Create account"}
        </Button>

        <Button type="button" className="w-full" variant="outline" disabled title="SSO will be enabled soon">
          Continue with SSO (coming soon)
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </form>
  )
}
