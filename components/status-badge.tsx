"use client"

import type * as React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status?: "active" | "inactive" | "queued" | "processing" | "completed" | "failed" | "pending" | "running"
  className?: string
}

export default function StatusBadge({ status = "active", className }: StatusBadgeProps) {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    active: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "bg-emerald-100 text-emerald-700", label: "Active" },
    inactive: { icon: <Circle className="h-3.5 w-3.5" />, cls: "bg-slate-100 text-slate-700", label: "Inactive" },
    queued: { icon: <Circle className="h-3.5 w-3.5" />, cls: "bg-slate-100 text-slate-700", label: "Queued" },
    pending: { icon: <Circle className="h-3.5 w-3.5" />, cls: "bg-amber-100 text-amber-700", label: "Pending" },
    running: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      cls: "bg-blue-100 text-blue-700",
      label: "Running",
    },
    processing: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      cls: "bg-amber-100 text-amber-700",
      label: "Processing",
    },
    completed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      cls: "bg-emerald-100 text-emerald-700",
      label: "Completed",
    },
    failed: { icon: <XCircle className="h-3.5 w-3.5" />, cls: "bg-rose-100 text-rose-700", label: "Failed" },
  }
  const entry = map[status] ?? map.active
  return (
    <Badge className={cn("gap-1", entry.cls, className)}>
      {entry.icon}
      <span>{entry.label}</span>
    </Badge>
  )
}
