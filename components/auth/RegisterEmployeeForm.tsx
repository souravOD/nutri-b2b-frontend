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
import { ChevronRight } from "lucide-react"

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
    return a.createEmailSession(email, password)
  }
  if (typeof a.createEmailPasswordSession === "function") {
    return a.createEmailPasswordSession(email, password)
  }
  if (typeof a.createSession === "function") {
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

      await account.create(ID.unique(), email, password, fullName)
      await createEmailPasswordSession(email, password)
      await (account as any).createVerification(redirectUrl)

      toast({ title: "Verify your email", description: "We sent you a verification link." })
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      const code = err?.code ?? err?.response?.code ?? err?.response?.status
      const msg = String(err?.message ?? "").toLowerCase()
      const is409 =
        code === 409 ||
        msg.includes("user_already_exists") ||
        /already exists|already registered/i.test(err?.message ?? "")
      toast({
        title: is409 ? "Email already registered" : "Signup failed",
        description: is409
          ? "An account with this email already exists. Please log in instead."
          : err?.message ?? "Could not create account",
        variant: "destructive",
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="font-semibold text-[#0f172a] text-sm">
          Full name
        </Label>
        <Input
          id="fullName"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="border-[#cbd5e1] rounded-lg h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="font-semibold text-[#0f172a] text-sm">
          Work email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-[#cbd5e1] rounded-lg h-12"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="font-semibold text-[#0f172a] text-sm">
            Password
          </Label>
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="text-[12px] font-bold text-[#0067a0] tracking-[0.6px] uppercase hover:underline"
          >
            {showPw ? "HIDE" : "SHOW"}
          </button>
        </div>
        <Input
          id="password"
          type={showPw ? "text" : "password"}
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-describedby="pwHelp"
          className="border-[#cbd5e1] rounded-lg h-12"
        />
        <p id="pwHelp" className="text-[12px] text-[#64748b] pt-1">
          Must be at least 12 characters long.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex gap-3 items-start">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
            className="rounded border-[#cbd5e1] mt-1"
          />
          <Label htmlFor="terms" className="font-normal text-[14px] text-[#475569] cursor-pointer leading-[17.5px]">
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-[#00438f] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-[#00438f] hover:underline">
              Privacy Policy
            </a>
            .
          </Label>
        </div>
        <div className="flex gap-3 items-start">
          <Checkbox
            id="dpa"
            checked={acceptDpa}
            onCheckedChange={(v) => setAcceptDpa(Boolean(v))}
            className="rounded border-[#cbd5e1] mt-1"
          />
          <Label htmlFor="dpa" className="font-normal text-[14px] text-[#475569] cursor-pointer leading-[17.5px]">
            I agree to the{" "}
            <a href="/dpa" target="_blank" rel="noreferrer" className="font-medium text-[#00438f] hover:underline">
              Data Processing Agreement (DPA)
            </a>
            .
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-lg bg-[#00438f] hover:bg-[#003366] text-white font-bold text-base shadow-sm"
        disabled={working}
      >
        {working ? (
          "Creating account…"
        ) : (
          <span className="inline-flex items-center gap-2">
            Create account
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>

      <div className="border-t border-[#f1f5f9] pt-6">
        <p className="text-center text-sm text-[#475569]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#0067a0] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </form>
  )
}
