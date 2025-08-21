"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

export default function Home() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/dashboard")
  }, [router])
  return <div>{"Redirecting..."}</div>
}
