"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { UserCheck, UserX, Mail, Phone } from "lucide-react"
import type { UICustomer } from "@/types/customer"

type Props = {
  customer: UICustomer
  onOpen?: (id: string) => void
  onRunMatch?: (id: string) => void
}

export default function CustomerCard({ customer, onOpen, onRunMatch }: Props) {
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

  const tags = customer.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const remainingTagsCount = tags.length - visibleTags.length

  return (
    <Card
      className="hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer border-[#e2e8f0] rounded-xl"
      onClick={() => onOpen?.(customer.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-[#f0f4f8]">
              <AvatarImage src={customer.avatar || "/placeholder.svg"} alt={customer.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[#0f172a] truncate">{customer.name}</h3>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" />
                {customer.email}
              </p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {customer.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`text-xs ${getStatusColor(customer.status)}`}>{customer.status}</Badge>
            {customer.healthProfile
              ? <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium"><UserCheck className="h-3 w-3" />Profile</span>
              : <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><UserX className="h-3 w-3" />No profile</span>
            }
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-[#f1f5f9] text-primary">
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
        )}

        {/* Quick Actions: View Profile and Match Products only per Figma */}
        <div className="flex gap-2 pt-2 border-t border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpen?.(customer.id) }}
            className="text-primary hover:text-[#003366] hover:bg-primary/10"
          >
            View Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRunMatch?.(customer.id) }}
            className="text-primary hover:text-[#003366] hover:bg-primary/10"
          >
            Match Products
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
