"use client"

import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Bell, CheckCircle, Clock, XCircle } from 'lucide-react'

const alerts = [
  {
    id: "1",
    title: "High Priority Match Found",
    description: "New customer match with 95% compatibility score",
    type: "success",
    priority: "high",
    timestamp: "2 minutes ago",
    status: "unread",
  },
  {
    id: "2",
    title: "Product Import Failed",
    description: "Failed to import 15 products from CSV file",
    type: "error",
    priority: "high",
    timestamp: "1 hour ago",
    status: "unread",
  },
  {
    id: "3",
    title: "Weekly Report Ready",
    description: "Your weekly nutrition analysis report is ready for download",
    type: "info",
    priority: "medium",
    timestamp: "3 hours ago",
    status: "read",
  },
  {
    id: "4",
    title: "System Maintenance Scheduled",
    description: "Scheduled maintenance window: Sunday 2AM - 4AM EST",
    type: "warning",
    priority: "medium",
    timestamp: "1 day ago",
    status: "read",
  },
]

const getAlertIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "error":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    default:
      return <Bell className="h-4 w-4 text-blue-600" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive"
    case "medium":
      return "default"
    case "low":
      return "secondary"
    default:
      return "outline"
  }
}

export default function AlertsPage() {
  const unreadAlerts = alerts.filter((alert) => alert.status === "unread")
  const readAlerts = alerts.filter((alert) => alert.status === "read")

  return (
    <AppShell title="Alerts">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">Stay updated with important notifications and system events</p>
          </div>
          <Button>Mark All as Read</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadAlerts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter((alert) => alert.priority === "high").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadAlerts.length})</TabsTrigger>
            <TabsTrigger value="read">Read ({readAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={alert.status === "unread" ? "border-l-4 border-l-blue-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{alert.title}</CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(alert.priority) as any}>{alert.priority}</Badge>
                      {alert.status === "unread" && <Badge variant="outline">New</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{alert.timestamp}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Dismiss
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {unreadAlerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{alert.title}</CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(alert.priority) as any}>{alert.priority}</Badge>
                      <Badge variant="outline">New</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{alert.timestamp}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Dismiss
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            {readAlerts.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{alert.title}</CardTitle>
                        <CardDescription>{alert.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(alert.priority) as any}>{alert.priority}</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{alert.timestamp}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Archive
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
