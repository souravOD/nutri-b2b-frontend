// app/customers/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Search, Plus, Grid3X3, List, Eye, StickyNote, Tag } from "lucide-react"
import CustomerCard from "@/components/customers/CustomerCard"
import CustomerFilters from "@/components/customers/CustomerFilters"
import CustomerForm from "@/components/customers/CustomerForm"
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import CustomerDetailsDrawer from "@/components/customers/CustomerDetailsDrawer";
import CustomerListEmpty from "@/components/customers/CustomerListEmpty"
import type { Customer } from "@/app/api/_store"

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // URL state (no path redirects!)
  const view = (searchParams.get("view") as "cards" | "list") || "cards"
  const query = searchParams.get("q") || ""
  const selectedStatus = (searchParams.get("status") as "all" | "active" | "archived") || "all"
  const selectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || []
  const selectedId = searchParams.get("id") || ""

  // Component state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)

  // Fetch customers once (use your existing API route/proxy if needed)
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch("/api/customers")
          const data = await res.json()
          const list = Array.isArray(data) ? data : data?.items || []
          if (!cancelled) setCustomers(list)
        } catch (e) {
          console.error(e)
          toast({ title: "Failed to load customers", variant: "destructive" })
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [toast])

  // Open/close drawer based on `?id=`
  useEffect(() => {
    setDetailsDrawerOpen(!!selectedId)
  }, [selectedId])

  // helpers to update URL params (NO path change)
  const setParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/customers?${params.toString()}`)
  }

  const handleSearch = (v: string) => setParam("q", v || undefined)
  const handleView = (v: "cards" | "list") => setParam("view", v === "cards" ? undefined : v)
  const handleStatus = (v: "all" | "active" | "archived") => setParam("status", v === "all" ? undefined : v)
  const handleTags = (tags: string[]) => setParam("tags", tags.length ? tags.join(",") : undefined)
  const openDetails = (id: string) => setParam("id", id)
  const closeDetails = (open: boolean) => { if (!open) setParam("id", undefined) }

  // client-side filtering
  const allTags = useMemo(() => {
    const s = new Set<string>()
    customers.forEach(c => (c as any)?.tags?.forEach((t: string) => s.add(t)))
    return Array.from(s).sort()
  }, [customers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter(c => {
      if (selectedStatus !== "all" && (c as any)?.status !== selectedStatus) return false
      if (selectedTags.length) {
        const tags = (c as any)?.tags || []
        if (!selectedTags.every(t => tags.includes(t))) return false
      }
      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      )
    })
  }, [customers, query, selectedStatus, selectedTags])

  const handleCreateCustomer = async (payload: Omit<Customer, "id" | "updatedAt">) => {
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to create customer")
      const created = await response.json()
      setCustomers(prev => [created, ...prev])
      setCreateDialogOpen(false)
      toast({ title: "Customer created" })
    } catch (e: any) {
      toast({ title: e.message || "Failed to create customer", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <AppShell title="Customers" subtitle="Manage customer profiles and run matches">
        <div className="grid gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-40" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  const count = filtered.length

  return (
    <AppShell title="Customers" subtitle="Manage customer profiles and run matches">
      <div className="flex flex-col gap-6">
        {/* top controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              className="pl-9"
              defaultValue={query}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          <CustomerFilters
            status={selectedStatus}
            tags={selectedTags}
            allTags={allTags}
            onChange={({ status, tags }) => { handleStatus(status); handleTags(tags) }}
          />

          <Tabs value={view} onValueChange={v => handleView(v as any)} className="ml-auto">
            <TabsList>
              <TabsTrigger value="cards" className="gap-2">
                <Grid3X3 className="h-4 w-4" /> Cards <Badge variant="outline">{count}</Badge>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" /> List <Badge variant="outline">{count}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>

        {/* results */}
        {filtered.length === 0 ? (
          <CustomerListEmpty onAddCustomer={() => setCreateDialogOpen(true)} />
        ) : view === "cards" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {filtered.map(c => (
              <CustomerCard
                key={c.id}
                customer={c}
                onOpen={() => openDetails(String(c.id))}         // stays on /customers
                onRunMatch={() => openDetails(String(c.id))}      // stays on /customers
                onOpenNotes={() => openDetails(String(c.id))}         // stays on /customers
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage alt={c.name} />
                        <AvatarFallback>{(c.name || "C").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {"status" in c ? <Badge variant={(c as any).status === "active" ? "default" : "secondary"}>{(c as any).status}</Badge> : null}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {(c as any)?.tags?.slice(0, 4)?.map((t: string) => (
                        <Badge key={t} variant="outline" className="inline-flex gap-1">
                          <Tag className="h-3 w-3" /> {t}
                        </Badge>
                      ))}
                      {(c as any)?.tags?.length > 4 && <Badge variant="outline">+{(c as any).tags.length - 4}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openDetails(String(c.id))}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openDetails(String(c.id))}>
                          {/* reuse for match; keeps URL /customers */}
                          <StickyNote className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* create dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm
              onClose={() => setCreateDialogOpen(false)}
              onCreated={(created) => {
                setCustomers((prev) => [created as any, ...prev]);
                setCreateDialogOpen(false);
                toast({ title: "Customer created" });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* details drawer — controlled by ?id= */}
        <CustomerDetailsDrawer open={detailsDrawerOpen} id={selectedId} onOpenChange={closeDetails} />
      </div>
    </AppShell>
  )
}
