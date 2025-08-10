"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"

export default function OfflineIndicator() {
  const [online, setOnline] = React.useState(true)
  React.useEffect(() => {
    setOnline(navigator.onLine)
    const handlerUp = () => setOnline(true)
    const handlerDown = () => setOnline(false)
    window.addEventListener("online", handlerUp)
    window.addEventListener("offline", handlerDown)
    return () => {
      window.removeEventListener("online", handlerUp)
      window.removeEventListener("offline", handlerDown)
    }
  }, [])
  if (online) return null
  return (
    <Badge variant="destructive" className="whitespace-nowrap">
      {"Offline"}
    </Badge>
  )
}
