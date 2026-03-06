"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { UICustomer } from "@/types/customer"

type Props = {
  customer: UICustomer
  onOpen?: (id: string) => void
  onRunMatch?: (id: string) => void
  onOpenNotes?: (id: string) => void
}

export default function CustomerCard({ customer, onOpen, onRunMatch, onOpenNotes }: Props) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "archived":
        return "bg-slate-100 text-slate-600 border-slate-200"
      default:
        return "bg-slate-100 text-slate-600 border-slate-200"
    }
  }

  const restrictions = customer.restrictions ?? { required: [], preferred: [], allergens: [], conditions: [] }
  const healthChips = [
    ...(restrictions.required ?? []).slice(0, 2),
    ...(restrictions.allergens ?? []).slice(0, 2),
    ...(restrictions.conditions ?? []).slice(0, 2),
  ].slice(0, 4)

  const remainingHealthCount =
    (restrictions.required?.length ?? 0) +
    (restrictions.allergens?.length ?? 0) +
    (restrictions.conditions?.length ?? 0) -
    healthChips.length

  const tags = customer.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const remainingTagsCount = tags.length - visibleTags.length

  return (
    <Card
      className="hover:shadow-lg hover:border-[#00438f]/30 transition-all cursor-pointer border-[#e2e8f0] rounded-xl"
      onClick={() => onOpen?.(customer.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-[#f0f4f8]">
              <AvatarImage src={customer.avatar || "/placeholder.svg"} alt={customer.name} />
              <AvatarFallback className="bg-[#00438f]/10 text-[#00438f] font-medium text-sm">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[#0f172a] truncate">{customer.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>
              )}
            </div>
          </div>
          <Badge className={`text-xs shrink-0 ${getStatusColor(customer.status)}`}>{customer.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Health Snapshot */}
        {healthChips.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Health Restrictions</p>
            <div className="flex flex-wrap gap-1.5">
              {healthChips.map((chip, index) => (
                <Badge key={index} variant="outline" className="text-xs border-[#e2e8f0]">
                  {chip}
                </Badge>
              ))}
              {remainingHealthCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs border-[#e2e8f0]">
                        +{remainingHealthCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {(restrictions.required ?? []).slice(2).map((item, i) => (
                          <div key={i} className="text-xs">{item}</div>
                        ))}
                        {(restrictions.allergens ?? []).slice(2).map((item, i) => (
                          <div key={i} className="text-xs">{item}</div>
                        ))}
                        {(restrictions.conditions ?? []).slice(2).map((item, i) => (
                          <div key={i} className="text-xs">{item}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-[#f1f5f9] text-[#00438f]">
                  {tag}
                </Badge>
              ))}
              {remainingTagsCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-[#f0f4f8]">
                        +{remainingTagsCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {tags.slice(3).map((tag, i) => (
                          <div key={i} className="text-xs">{tag}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpen?.(customer.id) }}
            className="text-[#00438f] hover:text-[#003366] hover:bg-[#00438f]/10"
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRunMatch?.(customer.id) }}
            className="text-[#00438f] hover:text-[#003366] hover:bg-[#00438f]/10"
          >
            Match
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpenNotes?.(customer.id) }}
            className="text-[#00438f] hover:text-[#003366] hover:bg-[#00438f]/10"
          >
            Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
