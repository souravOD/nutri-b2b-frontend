"use client"

import * as React from "react"
import { Bell, Package, Users, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotificationPanelProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

const mockNotifications = [
  {
    id: "1",
    title: "Import job completed",
    description: "Product import finished with 245 items processed",
    timestamp: "2 minutes ago",
    type: "success",
    unread: true,
    icon: CheckCircle,
  },
  {
    id: "2",
    title: "New customer match",
    description: "Found 12 new product matches for Jane Smith",
    timestamp: "15 minutes ago",
    type: "info",
    unread: true,
    icon: Users,
  },
  {
    id: "3",
    title: "Compliance alert",
    description: "Product ABC123 missing allergen information",
    timestamp: "1 hour ago",
    type: "warning",
    unread: false,
    icon: AlertTriangle,
  },
  {
    id: "4",
    title: "Inventory update",
    description: "15 products updated from supplier feed",
    timestamp: "3 hours ago",
    type: "info",
    unread: false,
    icon: Package,
  },
]

export default function NotificationPanel({ children, open, onOpenChange }: NotificationPanelProps) {
  const [notifications, setNotifications] = React.useState(mockNotifications)

  const unreadCount = notifications.filter((n) => n.unread).length
  const unreadNotifications = notifications.filter((n) => n.unread)

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-80">
              {unreadNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No unread notifications</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} onMarkRead={markAsRead} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-80">
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} onMarkRead={markAsRead} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: (typeof mockNotifications)[0]
  onMarkRead: (id: string) => void
}) {
  const Icon = notification.icon

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
        notification.unread ? "bg-muted/30" : ""
      }`}
      onClick={() => onMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`h-4 w-4 mt-0.5 ${
            notification.type === "success"
              ? "text-green-600"
              : notification.type === "warning"
                ? "text-yellow-600"
                : "text-blue-600"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{notification.title}</p>
            {notification.unread && <div className="h-2 w-2 bg-blue-600 rounded-full" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
          <p className="text-xs text-muted-foreground mt-2">{notification.timestamp}</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs bg-transparent">
          View
        </Button>
      </div>
    </div>
  )
}
