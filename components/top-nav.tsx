"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, Search, ChevronDown, CircleAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import OfflineIndicator from "./offline-indicator"

type TopNavProps = {
  title?: string
}
export default function TopNav({ title = "Odyssey Nutrition" }: TopNavProps) {
  const [query, setQuery] = React.useState("")
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href="/dashboard" className="font-semibold text-sm md:text-base">
          {title}
        </Link>
        <div className="flex-1">
          <div className="relative max-w-lg">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across products, customers, jobs..."
              className="pl-8"
              aria-label="Global search"
            />
          </div>
        </div>
        <OfflineIndicator />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">{"Notifications"}</span>
          <span className="absolute -right-1 -top-1 bg-emerald-600 text-white text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
            {"3"}
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Image
                src="/diverse-avatars.png"
                alt="User avatar"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="hidden sm:inline">{"vendor@odyssey"}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{"My Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{"Profile"}</DropdownMenuItem>
            <DropdownMenuItem>{"Settings"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">{"Logout"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="sr-only" aria-live="polite">
          {"Top navigation"}
        </span>
      </div>
      <div className="px-4 pb-2 md:px-6 text-xs text-muted-foreground flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-amber-500" />
        <span>{"System status: All systems operational"}</span>
      </div>
    </header>
  )
}
