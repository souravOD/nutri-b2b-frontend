"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export default function NewProductPage() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/products?add=1")
  }, [router])
  return null
}
