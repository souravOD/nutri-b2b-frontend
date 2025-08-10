"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EnhancedDataTable from "@/components/enhanced-data-table"
import type { ColumnDef } from "@tanstack/react-table"
import Image from "next/image"
import { MoreHorizontal } from "lucide-react"
import ProductForm from "@/components/product-form"
import ImportWizard from "@/components/import-wizard"
import { useToast } from "@/hooks/use-toast"

type Product = {
  id: string
  name: string
  sku: string
  status: "active" | "inactive"
  category: string
  tags: string[]
  imageUrl?: string
  updatedAt: string
}

export default function ProductsPage() {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "active" | "inactive">("all")
  const [category, setCategory] = React.useState<string | "all">("all")
  const [data, setData] = React.useState<Product[]>([])
  const [selected, setSelected] = React.useState<Product[]>([])
  const [view, setView] = React.useState<"table" | "cards">("table")
  const { toast } = useToast()

  const load = React.useCallback(async () => {
    const res = await fetch("/api/products")
    const json = await res.json()
    setData(json.items as Product[])
  }, [])
  React.useEffect(() => {
    load()
  }, [load])

  const filtered = data.filter((p) => {
    const q = query.toLowerCase()
    const okQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    const okS = status === "all" || p.status === status
    const okC = category === "all" || p.category === category
    return okQ && okS && okC
  })

  const columns: ColumnDef<Product>[] = [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <Image
          src={row.original.imageUrl || "/placeholder.svg?height=64&width=64&query=product"}
          alt={`${row.original.name} image`}
          width={48}
          height={48}
          className="rounded object-cover aspect-square"
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.sku}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
          }
        >
          {row.original.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
          {row.original.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">{`+${row.original.tags.length - 3}`}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => <span className="text-sm">{new Date(row.original.updatedAt).toLocaleString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{"Actions"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{"Edit"}</DropdownMenuItem>
            <DropdownMenuItem>{"Duplicate"}</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600">{"Delete"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppShell title="Products">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Input
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
            aria-label="Search products"
          />
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="all">{"All"}</TabsTrigger>
            <TabsTrigger value="active">{"Active"}</TabsTrigger>
            <TabsTrigger value="inactive">{"Inactive"}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" onClick={() => setCategory(category === "all" ? "Beverages" : "all")}>
          {category === "all" ? "Filter: All Categories" : `Filter: ${category}`}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>
            {"Table"}
          </Button>
          <Button variant={view === "cards" ? "default" : "outline"} onClick={() => setView("cards")}>
            {"Cards"}
          </Button>
          <ImportWizard
            onComplete={() => {
              load()
            }}
          />
          <ProductForm mode="create" onSaved={load} />
        </div>
      </div>

      {view === "table" ? (
        <EnhancedDataTable
          data={filtered}
          columns={columns}
          selectable
          onSelectionChange={(rows) => setSelected(rows as Product[])}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-center gap-3">
                <Image
                  src={p.imageUrl || "/placeholder.svg?height=80&width=80&query=product"}
                  alt={`${p.name} image`}
                  width={80}
                  height={80}
                  className="rounded object-cover aspect-square"
                />
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="ml-auto">
                  <Badge
                    className={
                      p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" disabled={selected.length === 0}>
          {"Export Selected"}
        </Button>
        <Button variant="outline" disabled={selected.length === 0}>
          {"Update Status"}
        </Button>
        <Button
          variant="destructive"
          disabled={selected.length === 0}
          onClick={() => {
            toast({ title: "Deleted", description: `${selected.length} product(s) deleted (demo).` })
            setSelected([])
          }}
        >
          {"Delete"}
        </Button>
        <div className="text-sm text-muted-foreground ml-auto">
          {selected.length > 0 ? `${selected.length} selected` : ""}
        </div>
      </div>
    </AppShell>
  )
}
