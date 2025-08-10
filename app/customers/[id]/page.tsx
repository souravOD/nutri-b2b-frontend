"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import DietaryRestrictionSelector from "@/components/dietary-restriction-selector"
import ProductMatchCard from "@/components/product-match-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  status: "active" | "archived"
  restrictions: {
    required: string[]
    preferred: string[]
    allergens: string[]
    conditions: string[]
    notes?: string
  }
}

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [matches, setMatches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filterScore, setFilterScore] = React.useState<"all" | "80" | "60" | "40">("all")
  const [view, setView] = React.useState<"grid" | "list">("grid")

  React.useEffect(() => {
    const load = async () => {
      const custs = await fetch("/api/customers").then((r) => r.json())
      const c = (custs.items as Customer[])[0]
      setCustomer(c)
      const m = await fetch(`/api/customers/${params.id}/matches`).then((r) => r.json())
      setMatches(m.items)
      setLoading(false)
    }
    load()
  }, [params.id])

  const filtered = matches.filter((m) => {
    if (filterScore === "all") return true
    return m.score >= Number.parseInt(filterScore, 10)
  })

  return (
    <AppShell title="Customer">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{"Profile"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="/diverse-avatars.png" alt="Avatar" />
                <AvatarFallback>{"JD"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{customer?.name ?? "Customer"}</div>
                <div className="text-xs text-muted-foreground">{customer?.email ?? ""}</div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{"Name"}</Label>
              <Input defaultValue={customer?.name ?? ""} />
              <Label>{"Email"}</Label>
              <Input defaultValue={customer?.email ?? ""} />
              <Label>{"Phone"}</Label>
              <Input defaultValue={customer?.phone ?? ""} />
            </div>
            <div className="flex gap-2">
              <Button>{"Save"}</Button>
              <Button variant="outline">{"Cancel"}</Button>
            </div>
            <hr className="my-2" />
            <div className="space-y-2">
              <Label>{"Dietary Restrictions"}</Label>
              <DietaryRestrictionSelector
                value={customer?.restrictions}
                onChange={(v) => setCustomer((c) => (c ? { ...c, restrictions: v! } : c))}
              />
              <Label>{"Notes"}</Label>
              <Input defaultValue={customer?.restrictions.notes ?? ""} />
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Tabs value={filterScore} onValueChange={(v) => setFilterScore(v as any)}>
              <TabsList>
                <TabsTrigger value="all">{"All"}</TabsTrigger>
                <TabsTrigger value="80">{">= 80%"}</TabsTrigger>
                <TabsTrigger value="60">{">= 60%"}</TabsTrigger>
                <TabsTrigger value="40">{">= 40%"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>
              {"Grid"}
            </Button>
            <Button variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
              {"List"}
            </Button>
            <Button className="ml-auto">{"Run New Match"}</Button>
          </div>
          {view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((m) => (
                <ProductMatchCard
                  key={m.product.id}
                  imageUrl={m.product.imageUrl}
                  name={m.product.name}
                  brand={m.product.category}
                  sku={m.product.sku}
                  score={m.score}
                  passTags={m.compliance.pass}
                  warnTags={m.compliance.warn}
                  failTags={m.compliance.fail}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <Card key={m.product.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.product.imageUrl || "/placeholder.svg?height=64&width=64&query=product"}
                      alt="Product"
                      className="h-16 w-16 rounded object-cover"
                    />
                    <div className="min-w-0">
                      <div className="font-medium">{m.product.name}</div>
                      <div className="text-xs text-muted-foreground">{m.product.sku}</div>
                    </div>
                    <div className="ml-auto text-sm">{m.score}%</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
