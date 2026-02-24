"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useMemo } from "react"
import AuthGuard from "@/components/auth-guard"
import TenantProvider from "@/components/auth/TenantProvider"
import { useAuth, type UserRole } from "@/hooks/useAuth"

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

// ── Nav item type with optional role / permission gating ───────────
type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** If set, item is only visible to these roles (superadmin always sees everything) */
  roles?: UserRole[]
  /** If set, user must hold this permission (or wildcard) */
  permission?: string
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Products", href: "/products", icon: Package },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Jobs", href: "/jobs", icon: Boxes },
  { title: "Search", href: "/search", icon: Search },
  { title: "Alerts", href: "/alerts", icon: Bell },
  { title: "Compliance", href: "/compliance", icon: Shield, roles: ["superadmin", "vendor_admin"] },
  { title: "Vendors", href: "/vendors", icon: Building2, roles: ["superadmin"] },
  { title: "User Management", href: "/user-management", icon: User, permission: "manage:users" },
]

const moreNavItems: NavItem[] = [
  { title: "Profile", href: "/profile", icon: User },
  { title: "Settings", href: "/settings", icon: Settings, permission: "manage:settings" },
  { title: "Tenant Selector", href: "/tenant", icon: Building },
  { title: "Onboarding", href: "/onboarding", icon: GraduationCap },
]

// ── Helper: filter nav items based on user's role + permissions ────
function useFilteredNavItems(items: NavItem[]) {
  const { authContext } = useAuth()

  return useMemo(() => {
    const { role, permissions } = authContext
    if (!role) return items // not loaded yet — show all (guards protect actual pages)

    return items.filter((item) => {
      // superadmin sees everything
      if (role === "superadmin" || permissions.includes("*")) return true

      // Check role constraint
      if (item.roles && !item.roles.includes(role)) return false

      // Check permission constraint
      if (item.permission && !permissions.includes(item.permission)) return false

      return true
    })
  }, [items, authContext])
}

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
  const filteredMain = useFilteredNavItems(mainNavItems)
  const filteredMore = useFilteredNavItems(moreNavItems)

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
              {filteredMain.map((item) => (
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
                  {filteredMore.map((item) => (
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
