"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import AuthGuard from "@/components/auth-guard"
import TenantProvider from "@/components/auth/TenantProvider"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Bell,
  Boxes,
  Building,
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Package,
  Search,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react"
import TopNav from "./top-nav"

type AppShellProps = {
  children?: React.ReactNode
  title?: string
  subtitle?: string
}

const mainNavItems = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Products", href: "/products", icon: Package },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Jobs", href: "/jobs", icon: Boxes },
  { title: "Search", href: "/search", icon: Search },
  { title: "Alerts", href: "/alerts", icon: Bell },
  { title: "Compliance", href: "/compliance", icon: Shield },
  { title: "Vendors", href: "/vendors", icon: Building2 },
]

const moreNavItems = [
  { title: "Profile", href: "/profile", icon: User },
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Tenant Selector", href: "/tenant", icon: Building },
  { title: "Onboarding", href: "/onboarding", icon: GraduationCap },
]

export default function AppShell({ children, title = "Odyssey Nutrition", subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar is always visible; guard protects the main content */}
        <TopNav title={title} />
        {/* 🔁 AuthGuard FIRST, so nothing below renders until auth is settled */}
        <AuthGuard>
          {/* TenantProvider now runs only after auth; prevents unauthenticated DB lookups */}
          <TenantProvider>
            <div className="px-4 md:px-6 py-4">{children}</div>
          </TenantProvider>
        </AuthGuard>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 pt-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-md bg-emerald-600 text-white inline-flex items-center justify-center font-semibold">
            {"O"}
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">{"Odyssey B2B"}</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{"Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || pathname.startsWith(item.href + "/")}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1 text-sm">
                {"More"}
                <ChevronRight className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-90" : ""}`} />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {moreNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <SidebarTrigger className="w-full justify-start">
            <span className="group-data-[collapsible=icon]:hidden">{"Collapse"}</span>
          </SidebarTrigger>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
