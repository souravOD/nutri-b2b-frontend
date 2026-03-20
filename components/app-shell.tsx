"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import AuthGuard from "@/components/auth-guard"

const B2BChatbot = dynamic(() => import("@/components/chatbot/B2BChatbot"), { ssr: false })

import { useAuth, type UserRole } from "@/hooks/useAuth"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"

/** Derives a display company name from the user's email domain.
 *  e.g. "abc@walmart.com" → "Walmart", "12df@odysseyts.com" → "Odysseyts"
 *  Returns null if email is missing or unparseable. */
function getNameFromEmail(email?: string | null): string | null {
  const company = email?.split("@")[1]?.split(".")[0]
  if (!company) return null
  return company.charAt(0).toUpperCase() + company.slice(1)
}

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
  BarChart3,
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Package,
  Search,
  Settings,
  Shield,
  Store,
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
  /** If true, active only when pathname === href (no startsWith) */
  exact?: boolean
  /** If set, active when pathname.startsWith(value + "/") — e.g. /vendors for /vendors/manage, /vendors/new */
  sectionMatch?: string
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Search", href: "/search", icon: Search },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Products", href: "/products", icon: Package },
  { title: "Jobs", href: "/jobs", icon: Boxes },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Alerts", href: "/alerts", icon: Bell },
  { title: "Compliance", href: "/compliance", icon: Shield, roles: ["superadmin", "vendor_admin"] },
  { title: "Tenant Selector", href: "/vendors", icon: Building2, roles: ["superadmin"], exact: true },
  { title: "Vendors", href: "/vendors/manage", icon: Store, roles: ["superadmin"], sectionMatch: "/vendors" },
  { title: "User Management", href: "/user-management", icon: User, permission: "manage:users" },
]

const moreNavItems: NavItem[] = [
  { title: "Onboarding", href: "/onboarding", icon: GraduationCap },
  { title: "Settings", href: "/settings", icon: Settings, permission: "manage:settings" },
]

// ── Helper: filter nav items based on user's role + permissions ────
function useFilteredNavItems(items: NavItem[]) {
  const { authContext } = useAuth()

  return useMemo(() => {
    const { role, permissions } = authContext

    return items.filter((item) => {
      // While role is unknown, only show items without any gating
      if (!role) {
        return !item.roles && !item.permission
      }

      // superadmin or wildcard permission sees everything
      if (role === "superadmin" || permissions.includes("*")) return true

      // Check role constraint
      if (item.roles && !item.roles.includes(role)) return false

      // Check permission constraint
      if (item.permission && !permissions.includes(item.permission)) return false

      return true
    })
  }, [items, authContext])
}

export default function AppShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const { user } = useAuth()
  const { vendorName } = useBrandingConfig()
  const companyName = getNameFromEmail(user?.email) ?? vendorName
  const navTitle = title ?? `${companyName} Vendor Portal`

  return (
    <SidebarProvider defaultOpen className="sidebar-vendor">
      <AppSidebar />
      <SidebarInset>
        {/* Top bar is always visible; guard protects the main content */}
        <TopNav title={navTitle} />
        {/* 🔁 AuthGuard FIRST, so nothing below renders until auth is settled */}
        <AuthGuard>
          <div className="px-4 md:px-6 py-4">{children}</div>
          <B2BChatbot />
        </AuthGuard>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { vendorName, logoUrl } = useBrandingConfig()
  const companyName = getNameFromEmail(user?.email) ?? vendorName
  const [moreOpen, setMoreOpen] = useState(false)
  const filteredMain = useFilteredNavItems(mainNavItems)
  const filteredMore = useFilteredNavItems(moreNavItems)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 pt-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-md bg-[#0C4A7F] text-white inline-flex items-center justify-center font-semibold text-sm overflow-hidden flex-shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
              : companyName.charAt(0).toUpperCase()
            }
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">{`${companyName} Vendor Portal`}</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{"Navigation"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMain.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : item.sectionMatch
                    ? pathname !== item.sectionMatch && pathname.startsWith(item.sectionMatch)
                    : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )})}
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
