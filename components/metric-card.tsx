"use client"

import type * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MetricCardProps = {
  title?: string
  value?: string | number
  trend?: number // positive up, negative down
  linkLabel?: string
  href?: string
  footerContent?: React.ReactNode
  progress?: number
  className?: string
}

export default function MetricCard({
  title = "Metric",
  value = "0",
  trend = 0,
  linkLabel = "View",
  href = "#",
  footerContent,
  progress,
  className,
}: MetricCardProps) {
  const TrendIcon = trend >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div className="text-3xl font-bold">{value}</div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
            trend >= 0 ? "text-emerald-600 bg-emerald-100" : "text-rose-600 bg-rose-100",
          )}
          aria-label={`Trend ${trend >= 0 ? "up" : "down"} ${Math.abs(trend)}%`}
        >
          <TrendIcon className="h-4 w-4" />
          <span>{`${Math.abs(trend)}%`}</span>
        </div>
      </CardContent>
      {typeof progress === "number" && (
        <CardContent>
          <Progress value={progress} aria-label="Progress" />
        </CardContent>
      )}
      <CardFooter className="justify-between">
        <Button asChild variant="link" className="px-0">
          <Link href={href}>{linkLabel}</Link>
        </Button>
        {footerContent}
      </CardFooter>
    </Card>
  )
}
