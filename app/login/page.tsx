"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import AuthLayout from "@/components/auth/AuthLayout"
import LoginForm from "@/components/auth/LoginForm"
import { account } from "@/lib/appwrite"

export default function LoginPage() {
  const router = useRouter()

  // If already logged in, go straight to dashboard (no toasts here)
  React.useEffect(() => {
    let done = false
    ;(async () => {
      try {
        const me = await account.get()
        if (!done && me?.$id) router.replace("/dashboard")
      } catch {
        /* not signed in -> stay on login */
      }
    })()
    return () => { done = true }
  }, [router])

  return (
    <AuthLayout
      title="Sign in to Odyssey"
      subtitle="Enter your credentials to access the B2B console."
    >
      <LoginForm />
    </AuthLayout>
  )
}
