"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, Play, StickyNote } from "lucide-react"
import type { Customer } from "@/app/api/_store"

type Props = {
  customer: Customer
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
        return "bg-green-100 text-green-800 border-green-200"
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const healthChips = [
    ...customer.restrictions.required.slice(0, 2),
    ...customer.restrictions.allergens.slice(0, 2),
    ...customer.restrictions.conditions.slice(0, 2),
  ].slice(0, 4)

  const remainingHealthCount =
    customer.restrictions.required.length +
    customer.restrictions.allergens.length +
    customer.restrictions.conditions.length -
    healthChips.length

  const visibleTags = customer.tags.slice(0, 3)
  const remainingTagsCount = customer.tags.length - visibleTags.length

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpen?.(customer.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={customer.avatar || "/placeholder.svg"} alt={customer.name} />
              <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{customer.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
              {customer.phone && <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>}
            </div>
          </div>
          <Badge className={`text-xs ${getStatusColor(customer.status)}`}>{customer.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Health Snapshot */}
        {healthChips.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Health Restrictions</p>
            <div className="flex flex-wrap gap-1">
              {healthChips.map((chip, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {chip}
                </Badge>
              ))}
              {remainingHealthCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs">
                        +{remainingHealthCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {customer.restrictions.required.slice(2).map((item, i) => (
                          <div key={i} className="text-xs">
                            {item}
                          </div>
                        ))}
                        {customer.restrictions.allergens.slice(2).map((item, i) => (
                          <div key={i} className="text-xs">
                            {item}
                          </div>
                        ))}
                        {customer.restrictions.conditions.slice(2).map((item, i) => (
                          <div key={i} className="text-xs">
                            {item}
                          </div>
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
        {customer.tags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {remainingTagsCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs">
                        +{remainingTagsCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {customer.tags.slice(3).map((tag, i) => (
                          <div key={i} className="text-xs">
                            {tag}
                          </div>
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
        <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onOpen?.(customer.id) }}
          >
            View
          </Button>

          <Button
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onRunMatch?.(customer.id) }}
          >
            Match
          </Button>

          <Button
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onOpenNotes?.(customer.id) }}
          >
            Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
