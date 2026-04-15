"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, X } from "lucide-react"

type Props = {
  status: "all" | "active" | "archived"
  tags: string[]
  allTags: string[]
  onChange: (filters: { status: "all" | "active" | "archived"; tags: string[] }) => void
}

export default function CustomerFilters({ status, tags, allTags, onChange }: Props) {
  const handleStatusChange = (newStatus: "all" | "active" | "archived") => {
    onChange({ status: newStatus, tags })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    onChange({ status, tags: newTags })
  }

  const handleClearAll = () => {
    onChange({ status: "all", tags: [] })
  }

  const hasActiveFilters = status !== "all" || tags.length > 0

  return (
    <div className="flex items-center gap-3 flex-nowrap flex-wrap">
      {/* Status pills: All | Active | Archived per Figma */}
      <Tabs value={status} onValueChange={handleStatusChange as (value: string) => void} className="shrink-0">
        <TabsList className="inline-grid grid-cols-3 w-auto shrink-0 bg-[#f1f5f9]">
          <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg">
            All
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg">
            Active
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg">
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* QUICK FILTERS: tag pills with dropdown per Figma */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider shrink-0">
            QUICK FILTERS:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {allTags.slice(0, 8).map((tag) => (
              <Button
                key={tag}
                variant={tags.includes(tag) ? "default" : "outline"}
                size="sm"
                className={`rounded-full h-8 px-3 text-sm shrink-0 ${
                  tags.includes(tag)
                    ? "bg-primary hover:bg-[#003366] text-white"
                    : "bg-[#f1f5f9] border-[#e2e8f0] hover:bg-[#e2e8f0] text-[#0f172a]"
                }`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
              </Button>
            ))}
            {allTags.length > 8 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 px-3 text-sm bg-[#f1f5f9] border-[#e2e8f0] hover:bg-[#e2e8f0]"
                  >
                    More
                    <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                  {allTags.slice(8).map((tag) => (
                    <DropdownMenuItem
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={tags.includes(tag) ? "bg-primary/10 text-primary" : ""}
                    >
                      {tag}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Clear All */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll} className="gap-2 text-[#64748b] hover:text-primary shrink-0">
          <X className="h-4 w-4" />
          Clear All
        </Button>
      )}
    </div>
  )
}
