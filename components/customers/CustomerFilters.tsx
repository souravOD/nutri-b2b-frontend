"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Filter, X } from "lucide-react"

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
    <div className="flex items-center gap-4">
      {/* Status Filter */}
      <Tabs value={status} onValueChange={handleStatusChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Tags
              {tags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filter by Tags</h4>
                {tags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ status, tags: [] })}
                    className="h-auto p-1 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Separator />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox id={tag} checked={tags.includes(tag)} onCheckedChange={() => handleTagToggle(tag)} />
                    <label
                      htmlFor={tag}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Active Filters Display */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => handleTagToggle(tag)}
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Clear All */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll} className="gap-2">
          <X className="h-4 w-4" />
          Clear All
        </Button>
      )}
    </div>
  )
}
