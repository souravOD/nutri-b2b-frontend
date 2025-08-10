"use client"
import { cn } from "@/lib/utils"

type MatchScoreProps = {
  score?: number // 0-100
  size?: "sm" | "md"
}

export default function MatchScore({ score = 0, size = "md" }: MatchScoreProps) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : pct >= 40 ? "bg-orange-500" : "bg-rose-500"
  return (
    <div className={cn("flex items-center gap-2", size === "sm" ? "text-xs" : "text-sm")}>
      <div className="relative h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-2", color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="tabular-nums">{pct}%</div>
    </div>
  )
}
