"use client"

import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Database, Globe, Key, Settings, Shield, Users } from 'lucide-react'

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="data">Data & Storage</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" defaultValue="Odyssey Nutrition" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDomain">Domain</Label>
                  <Input id="orgDomain" defaultValue="odysseynutrition.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgTimezone">Default Timezone</Label>
                  <select id="orgTimezone" className="w-full p-2 border rounded-md">
                    <option value="est">Eastern Time (EST)</option>
                    <option value="cst">Central Time (CST)</option>
                    <option value="mst">Mountain Time (MST)</option>
                    <option value="pst">Pacific Time (PST)</option>
                  </select>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
                <CardDescription>Configure system-wide behavior and defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-matching</Label>
                    <p className="text-sm text-muted-foreground">Automatically run product matching for new imports</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send system notifications via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Data Retention</Label>
                    <p className="text-sm text-muted-foreground">Automatically archive old data after 2 years</p>
                  </div>
                  <Switch />
                </div>
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>Manage external API connections and webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">USDA Food Data Central</h3>
                        <p className="text-sm text-muted-foreground">Nutrition data API integration</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Connected</Badge>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Nutrition Label API</h3>
                        <p className="text-sm text-muted-foreground">Automated label generation service</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Disconnected</Badge>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold">Compliance Checker</h3>
                        <p className="text-sm text-muted-foreground">Regulatory compliance validation</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Connected</Badge>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Configure webhook endpoints for real-time notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input id="webhookUrl" placeholder="https://your-app.com/webhook" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookEvents">Events</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="productMatch" defaultChecked />
                      <Label htmlFor="productMatch">Product Match Found</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="importComplete" defaultChecked />
                      <Label htmlFor="importComplete">Import Completed</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="complianceAlert" />
                      <Label htmlFor="complianceAlert">Compliance Alert</Label>
                    </div>
                  </div>
                </div>
                <Button>Add Webhook</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Active Users</h3>
                    <p className="text-sm text-muted-foreground">12 users currently active</p>
                  </div>
                  <Button>Invite User</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium">John Doe</h4>
                        <p className="text-sm text-muted-foreground">john.doe@example.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Admin</Badge>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className="font-medium">Jane Smith</h4>
                        <p className="text-sm text-muted-foreground">jane.smith@example.com</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">User</Badge>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure permissions for different user roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Administrator</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked disabled />
                        <span>Full system access</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked disabled />
                        <span>User management</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked disabled />
                        <span>System settings</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked disabled />
                        <span>Data export</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">User</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span>View products</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span>View customers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span>Edit products</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span>Data export</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button>Save Permissions</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Manage data storage, backups, and retention policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-semibold">Storage Used</h3>
                    <p className="text-2xl font-bold">2.4 GB</p>
                    <p className="text-sm text-muted-foreground">of 10 GB limit</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-semibold">Last Backup</h3>
                    <p className="text-lg font-bold">2 hours ago</p>
                    <p className="text-sm text-muted-foreground">Automatic daily backups</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <h3 className="font-semibold">Data Retention</h3>
                    <p className="text-lg font-bold">2 years</p>
                    <p className="text-sm text-muted-foreground">Auto-archive policy</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Backup Settings</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Create daily backups of all data</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Cloud Storage</Label>
                      <p className="text-sm text-muted-foreground">Store backups in cloud storage</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button>Create Backup Now</Button>
                  <Button variant="outline">Download Data</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure system security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">Auto-logout after 30 minutes of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">IP Restrictions</Label>
                      <p className="text-sm text-muted-foreground">Limit access to specific IP addresses</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all user actions and system events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <Button>Save Security Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for external integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Key className="h-6 w-6 text-gray-600" />
                      <div>
                        <h4 className="font-medium">Production API Key</h4>
                        <p className="text-sm text-muted-foreground font-mono">pk_live_••••••••••••••••</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Regenerate</Button>
                      <Button variant="outline" size="sm">Revoke</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Key className="h-6 w-6 text-gray-600" />
                      <div>
                        <h4 className="font-medium">Development API Key</h4>
                        <p className="text-sm text-muted-foreground font-mono">pk_test_••••••••••••••••</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Regenerate</Button>
                      <Button variant="outline" size="sm">Revoke</Button>
                    </div>
                  </div>
                </div>
                <Button>Generate New Key</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
