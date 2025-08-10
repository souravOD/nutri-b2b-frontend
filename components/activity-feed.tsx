"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

export type ActivityItem = {
  id: string
  type: "success" | "warning" | "error" | "info"
  title: string
  timestamp: string // ISO
  details?: string
}

type ActivityFeedProps = {
  items?: ActivityItem[]
  collapsible?: boolean
}

export default function ActivityFeed({ items = [], collapsible = true }: ActivityFeedProps) {
  const [open, setOpen] = React.useState(true)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{"Recent Activity"}</CardTitle>
        {collapsible && (
          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
          </Button>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          {items.length === 0 && <div className="text-sm text-muted-foreground">{"No recent activity"}</div>}
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={item.type} />
                <div className="text-sm font-medium">{item.title}</div>
                <div className="ml-auto text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</div>
              </div>
              {item.details && <div className="text-sm text-muted-foreground">{item.details}</div>}
              {idx < items.length - 1 && <Separator />}
            </div>
          ))}
          <Button variant="link" className="px-0">
            {"View All Activity"}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

function StatusBadge({ status = "info" as ActivityItem["type"] }) {
  const map: Record<ActivityItem["type"], { label: string; cls: string }> = {
    success: { label: "Success", cls: "bg-emerald-100 text-emerald-700" },
    warning: { label: "Warning", cls: "bg-amber-100 text-amber-700" },
    error: { label: "Error", cls: "bg-rose-100 text-rose-700" },
    info: { label: "Info", cls: "bg-slate-100 text-slate-700" },
  }
  const { label, cls } = map[status]
  return <Badge className={cls}>{label}</Badge>
}
