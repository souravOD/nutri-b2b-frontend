"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, CircleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import OfflineIndicator from "./offline-indicator";
import NotificationPanel from "./notification-panel";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/backend";

type TopNavProps = {
  title?: string;
};

export default function TopNav({ title = "Odyssey Nutrition" }: TopNavProps) {
  const [query, setQuery] = React.useState("");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [unreadAlerts, setUnreadAlerts] = React.useState(0);
  const router = useRouter();

  const { user, authContext, signOut } = useAuth();

  React.useEffect(() => {
    let cancelled = false;
    apiFetch("/api/alerts/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.unread === "number") setUnreadAlerts(d.unread);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push("/login");
    }
  };

  const displayName = user?.name || user?.email || "Guest";

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href="/dashboard" className="font-semibold text-sm md:text-base">
          {title}
        </Link>

        <div className="flex-1">
          <form onSubmit={handleSearch} className="relative max-w-lg">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, SKUs, or orders..."
              className="pl-9 bg-[#f0f4f8] rounded-[16px] border-0 focus-visible:ring-2"
              aria-label="Global search"
            />
          </form>
        </div>

        <OfflineIndicator />

        <NotificationPanel open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
            {unreadAlerts > 0 && (
              <span className="absolute -right-1 -top-1 bg-[#0067a0] text-white text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center" aria-label={`${unreadAlerts} unread`}>
                {unreadAlerts > 99 ? "99+" : unreadAlerts}
              </span>
            )}
          </Button>
        </NotificationPanel>

        {/* Right-side auth area */}
        {user ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Image
                  src="/diverse-avatars.png"
                  alt="User avatar"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="hidden sm:inline">{displayName}</span>
                {authContext?.role && (
                  <span className="hidden sm:inline text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                    {authContext.role.replace(/_/g, " ")}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            {/* High z-index + safe positioning so it never hides under sticky layers */}
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              collisionPadding={8}
              className="z-[1000] min-w-56"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onSelect={(e) => {
                  e.preventDefault(); // ensure our handler runs before close
                  handleSignOut();
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="underline text-sm">
              Sign in
            </Link>
            <Link href="/register" className="underline text-sm">
              Create account
            </Link>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          Top navigation
        </span>
      </div>

      <div className="px-4 pb-2 md:px-6 text-xs text-muted-foreground flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-amber-500" />
        <span>System status: All systems operational</span>
      </div>
    </header>
  );
}
