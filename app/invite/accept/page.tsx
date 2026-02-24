"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { account, teams, ID } from "@/lib/appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

function strongPassword(pw: string) {
    return (
        pw.length >= 12 &&
        /[A-Z]/.test(pw) &&
        /[a-z]/.test(pw) &&
        /\d/.test(pw) &&
        /[^A-Za-z0-9]/.test(pw)
    )
}

// Compat helper for different Appwrite SDK versions
async function createEmailPasswordSession(email: string, password: string) {
    const a: any = account
    if (typeof a.createEmailPasswordSession === "function") {
        return a.createEmailPasswordSession(email, password)
    }
    if (typeof a.createEmailSession === "function") {
        return a.createEmailSession(email, password)
    }
    throw new Error("No compatible Appwrite login method found")
}

type InviteData = {
    id: string
    email: string
    role: string
    vendor_name: string
}

const ROLE_LABELS: Record<string, string> = {
    vendor_admin: "Admin",
    vendor_operator: "Operator",
    vendor_viewer: "Viewer",
}

export default function AcceptInvitePage() {
    const router = useRouter()
    const params = useSearchParams()
    const { toast } = useToast()

    // ── URL params ──
    const token = params.get("token") || ""
    // Appwrite email redirect adds these params:
    const membershipId = params.get("membershipId") || ""
    const userId = params.get("userId") || ""
    const secret = params.get("secret") || ""
    const teamId = params.get("teamId") || ""

    // Determine the flow:
    // - If userId+secret+teamId+membershipId → user arrived via Appwrite email
    // - If only token → user has a manually shared link
    const isAppwriteEmailFlow = !!(membershipId && userId && secret && teamId)

    const [loading, setLoading] = React.useState(true)
    const [invite, setInvite] = React.useState<InviteData | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    const [fullName, setFullName] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPw, setConfirmPw] = React.useState("")
    const [showPw, setShowPw] = React.useState(false)
    const [working, setWorking] = React.useState(false)

    const redirectUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/verify`
            : "http://localhost:3001/verify"

    // Validate the token on mount
    React.useEffect(() => {
        if (!token) {
            setError("Missing invitation token.")
            setLoading(false)
            return
        }

        fetch(`${BACKEND_URL}/api/invitations/validate?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const body = await res.json().catch(() => ({} as any))
                if (!res.ok) {
                    throw new Error(body?.detail || "Invalid or expired invitation.")
                }
                setInvite(body)
            })
            .catch((err) => {
                setError(err?.message || "Failed to validate invitation.")
            })
            .finally(() => setLoading(false))
    }, [token])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!fullName.trim() || fullName.trim().length < 2) {
            return toast({ title: "Enter your full name", variant: "destructive" })
        }
        if (!strongPassword(password)) {
            return toast({
                title: "Weak password",
                description: "Use 12+ chars with upper, lower, number & symbol.",
                variant: "destructive",
            })
        }
        if (password !== confirmPw) {
            return toast({ title: "Passwords don't match", variant: "destructive" })
        }
        if (!invite) return

        try {
            setWorking(true)

            if (isAppwriteEmailFlow) {
                // ── Flow A: User arrived via Appwrite invitation email ──
                // The user was already created in Appwrite Auth by teams.createMembership.
                // We need to: accept the membership, set password, mark verified.

                // 1) Accept the team membership
                try {
                    await teams.updateMembershipStatus(teamId, membershipId, userId, secret)
                } catch (err: any) {
                    // If already accepted (e.g., refresh), continue
                    const msg = String(err?.message || "")
                    if (!/already|accepted|confirmed/i.test(msg)) {
                        console.warn("updateMembershipStatus failed:", msg)
                    }
                }

                // 2) Set password + verify email via backend
                const spRes = await fetch(`${BACKEND_URL}/api/invitations/set-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        token,
                        userId,
                        password,
                        fullName: fullName.trim(),
                    }),
                })
                const spBody = await spRes.json().catch(() => ({} as any))

                if (!spRes.ok) {
                    throw new Error(spBody?.detail || "Failed to set password.")
                }

                toast({
                    title: "Account set up!",
                    description: "Your password has been set. Redirecting to login…",
                })

                // Redirect to login — user can now sign in with their new password
                router.push("/login")
            } else {
                // ── Flow B: User has a manually shared link (no Appwrite user yet) ──
                // Create account from scratch, same as registration

                // 1) Create account
                await account.create(ID.unique(), invite.email, password, fullName.trim())

                // 2) Create a session (required for createVerification)
                await createEmailPasswordSession(invite.email, password)

                // 3) Send verification email — SAME mechanism as registration
                await (account as any).createVerification(redirectUrl)

                toast({
                    title: "Almost there!",
                    description: "We've sent a verification email. Check your inbox and click the link to complete setup.",
                })

                // 4) Go to /verify
                router.push(`/verify?email=${encodeURIComponent(invite.email)}`)
            }
        } catch (err: any) {
            const code = err?.code ?? err?.response?.code
            const msg = err?.message ?? ""

            if (code === 409 || /exist/i.test(msg)) {
                toast({
                    title: "Account already exists",
                    description: "This email is already registered. Try logging in instead.",
                })
                router.push("/login")
                return
            }

            toast({
                title: "Setup failed",
                description: msg || "Please try again.",
                variant: "destructive",
            })
        } finally {
            setWorking(false)
        }
    }

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center space-y-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted-foreground">Validating invitation…</p>
                </div>
            </div>
        )
    }

    // ── Error state ──
    if (error || !invite) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="max-w-md w-full mx-auto p-8 border rounded-lg shadow-sm bg-card text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <h1 className="text-xl font-semibold">Invalid Invitation</h1>
                    <p className="text-muted-foreground">{error || "This invitation link is not valid."}</p>
                    <Button variant="outline" onClick={() => router.push("/login")}>
                        Go to Login
                    </Button>
                </div>
            </div>
        )
    }

    // ── Accept invite form ──
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="max-w-md w-full mx-auto p-8 border rounded-lg shadow-sm bg-card space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">You&apos;re Invited!</h1>
                    <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{invite.vendor_name}</span>{" "}
                        has invited you to join as{" "}
                        <span className="font-medium text-foreground">
                            {ROLE_LABELS[invite.role] || invite.role}
                        </span>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email (read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={invite.email}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    {/* Full name */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Jane Doe"
                        />
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
                            >
                                {showPw ? "Hide" : "Show"}
                            </Button>
                        </div>
                        <p id="pwHelp" className="text-xs text-muted-foreground">
                            12+ chars incl. upper, lower, number &amp; symbol.
                        </p>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPw">Confirm password</Label>
                        <Input
                            id="confirmPw"
                            type={showPw ? "text" : "password"}
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={working}>
                        {working ? "Setting up your account…" : "Accept Invitation"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
