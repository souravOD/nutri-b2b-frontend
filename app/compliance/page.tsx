"use client"

import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, CheckCircle, FileText, Shield, XCircle } from 'lucide-react'

const complianceItems = [
  {
    id: "1",
    title: "FDA Nutrition Labeling",
    description: "Compliance with FDA nutrition facts labeling requirements",
    status: "compliant",
    lastChecked: "2024-01-15",
    nextReview: "2024-04-15",
    score: 98,
  },
  {
    id: "2",
    title: "USDA Organic Certification",
    description: "Organic product certification and labeling compliance",
    status: "warning",
    lastChecked: "2024-01-10",
    nextReview: "2024-02-10",
    score: 85,
  },
  {
    id: "3",
    title: "Allergen Declaration",
    description: "Proper allergen labeling and cross-contamination warnings",
    status: "non-compliant",
    lastChecked: "2024-01-12",
    nextReview: "2024-01-20",
    score: 65,
  },
  {
    id: "4",
    title: "Gluten-Free Claims",
    description: "Verification of gluten-free product claims and testing",
    status: "compliant",
    lastChecked: "2024-01-14",
    nextReview: "2024-03-14",
    score: 95,
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "compliant":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "non-compliant":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Shield className="h-4 w-4 text-gray-600" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "compliant":
      return "default"
    case "warning":
      return "secondary"
    case "non-compliant":
      return "destructive"
    default:
      return "outline"
  }
}

export default function CompliancePage() {
  const compliantItems = complianceItems.filter((item) => item.status === "compliant")
  const warningItems = complianceItems.filter((item) => item.status === "warning")
  const nonCompliantItems = complianceItems.filter((item) => item.status === "non-compliant")
  const overallScore = Math.round(complianceItems.reduce((acc, item) => acc + item.score, 0) / complianceItems.length)

  return (
    <AppShell title="Compliance">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
            <p className="text-muted-foreground">Monitor regulatory compliance and certification status</p>
          </div>
          <Button>Generate Report</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallScore}%</div>
              <Progress value={overallScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{compliantItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{warningItems.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{nonCompliantItems.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Items ({complianceItems.length})</TabsTrigger>
            <TabsTrigger value="compliant">Compliant ({compliantItems.length})</TabsTrigger>
            <TabsTrigger value="warning">Warnings ({warningItems.length})</TabsTrigger>
            <TabsTrigger value="non-compliant">Non-Compliant ({nonCompliantItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {complianceItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusColor(item.status) as any}>{item.status}</Badge>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{item.score}%</div>
                        <Progress value={item.score} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Last checked: {item.lastChecked} • Next review: {item.nextReview}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm">Update Status</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compliant" className="space-y-4">
            {compliantItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">compliant</Badge>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{item.score}%</div>
                        <Progress value={item.score} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Last checked: {item.lastChecked} • Next review: {item.nextReview}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="warning" className="space-y-4">
            {warningItems.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">warning</Badge>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{item.score}%</div>
                        <Progress value={item.score} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Last checked: {item.lastChecked} • Next review: {item.nextReview}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm">Resolve</Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="non-compliant" className="space-y-4">
            {nonCompliantItems.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(item.status)}
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">non-compliant</Badge>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{item.score}%</div>
                        <Progress value={item.score} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      Last checked: {item.lastChecked} • Next review: {item.nextReview}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm">Fix Issues</Button>
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
