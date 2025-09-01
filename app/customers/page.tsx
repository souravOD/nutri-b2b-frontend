"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Grid3X3, List as ListIcon } from "lucide-react";

import type { UICustomer } from "@/types/customer";
import { listCustomers, createCustomer } from "@/lib/api-customers";

import CustomerCard from "@/components/customers/CustomerCard";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import CustomerProfileDialog from "@/components/customers/CustomerProfileDialog"
import CustomerNotesDialog from "@/components/customers/CustomerNotesDialog"
import CustomerListEmpty from "@/components/customers/CustomerListEmpty";
import { apiFetch } from "@/lib/backend"

type CustomerDetails = {
  id: string
  fullName: string
  email?: string
  phone?: string
  type?: "Retailer" | "Distributor" | "Restaurant" | string
  status?: "Active" | "Inactive" | "Pending" | string
  gender?: string
  dob?: string
  externalId?: string
  vendorId?: string
  createdAt?: string
  updatedAt?: string
  location?: { city?: string; state?: string; postal?: string; country?: string }
  tags: string[]               // customTags/tags unified
}

/** Map backend → UI shape (robust to field name variants) */
function toCustomerDetails(src: any): CustomerDetails {
  const name =
    src?.fullName ||
    [src?.firstName, src?.lastName].filter(Boolean).join(" ") ||
    src?.name ||
    "Unnamed Customer"

  const tags = Array.isArray(src?.customTags)
    ? src.customTags
    : Array.isArray(src?.tags)
    ? src.tags
    : []

  const location =
    src?.location ?? {
      city: src?.city,
      state: src?.state,
      postal: src?.postal,
      country: src?.country,
    }

  return {
    id: String(src?.id ?? src?.customer_id ?? ""),
    fullName: name,
    email: src?.email ?? undefined,
    phone: src?.phone ?? undefined,
    type: src?.type ?? src?.customer_type ?? undefined,
    status: src?.status ?? undefined,
    gender: src?.gender ?? undefined,
    dob: src?.dob ?? undefined,
    externalId: src?.externalId ?? undefined,
    vendorId: src?.vendorId ?? undefined,
    createdAt: src?.createdAt ?? undefined,
    updatedAt: src?.updatedAt ?? undefined,
    location,
    tags,
  }
}

/** Fetch details from backend; IMPORTANT: uses apiFetch so we don’t hit the Next page */
function useCustomerDetails(id: string | null) {
  const [data, setData] = React.useState<CustomerDetails | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)


  

  React.useEffect(() => {
    if (!id) { setData(null); setError(null); return }
    let cancelled = false
    setLoading(true); setError(null)

    ;(async () => {
      try {
        // Prefer REST /customers/:id; fall back to /customers?id=...
        const res = await apiFetch(`/customers/${id}`)
        // if your backend doesn’t support /:id, swap to:
        // const res = await apiFetch(`/customers?id=${encodeURIComponent(id)}`)

        const json = await res.json().catch(() => null)
        // Handle {data:[...]} | {items:[...]} | {...} | [...]
        const raw = Array.isArray(json)
          ? json[0]
          : (json?.data?.[0] ?? json?.items?.[0] ?? json)

        if (!cancelled) setData(toCustomerDetails(raw || {}))
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load customer")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [id])

  return { data, loading, error }
}

/** URL param helpers */
type ParamState = {
  q?: string | null;
  status?: "all" | "active" | "archived" | null;
  tags?: string[] | null; // stored as CSV in URL
  view?: "cards" | "list" | null;
  id?: string | null;
};

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((): Required<ParamState> => {
    const q = searchParams.get("q") ?? "";
    const status = (searchParams.get("status") as "all" | "active" | "archived") || "all";
    const tagsCsv = searchParams.get("tags") || "";
    const tags = tagsCsv ? tagsCsv.split(",").filter(Boolean) : [];
    const view = (searchParams.get("view") as "cards" | "list") || "cards";
    const id = searchParams.get("id") || "";
    return { q, status, tags, view, id };
  }, [searchParams]);

  const set = React.useCallback(
    (next: Partial<ParamState>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
          current.delete(key);
          return;
        }
        if (Array.isArray(value)) {
          current.set(key, value.join(","));
        } else {
          current.set(key, String(value));
        }
      });
      const qs = current.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return { get, set };
}

export default function CustomersIndexPage() {
  const { toast } = useToast();
  const { get, set } = useUrlState();

  // data
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<UICustomer[]>([]);
  const [viewOpen, setViewOpen] = React.useState(false)
  const [viewId, setViewId] = React.useState<string | undefined>()
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [notesId, setNotesId] = React.useState<string | undefined>()
  const [notesName, setNotesName] = React.useState<string | undefined>()

  // UI state
  const url = get();
  const [createOpen, setCreateOpen] = React.useState(false);

  function openView(id: string) { setViewId(id); setViewOpen(true) }
  function openNotes(id: string, name: string) { setNotesId(id); setNotesName(name); setNotesOpen(true) }


  // load customers once
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    listCustomers()
      .then((items) => {
        if (!alive) return;
        setCustomers(items);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || "Failed to load customers");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // derived: all tags present in the list
  const allTags = React.useMemo(() => {
    const s = new Set<string>();
    customers.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  // filtering (client-side; mirrors Products)
  const filtered = React.useMemo(() => {
    const q = url.q.trim().toLowerCase();
    const status = url.status;
    const tags = new Set(url.tags);

    return customers.filter((c) => {
      if (status !== "all" && c.status !== status) return false;

      if (tags.size) {
        const hasAll = Array.from(tags).every((t) => c.tags?.includes(t));
        if (!hasAll) return false;
      }

      if (!q) return true;

      const hay = [
        c.name,
        c.email,
        c.phone,
        ...(c.tags || []),
        ...(c.restrictions?.required || []),
        ...(c.restrictions?.preferred || []),
        ...(c.restrictions?.allergens || []),
        ...(c.restrictions?.conditions || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [customers, url]);

  // handlers
  const handleSearch = (value: string) => set({ q: value || null });
  const handleViewChange = (view: "cards" | "list") => set({ view });
  const handleFiltersChange = (next: { status: "all" | "active" | "archived"; tags: string[] }) =>
    set({ status: next.status, tags: next.tags });
  const handleOpenDetails = (id: string | number) => set({ id: String(id) });
  const handleCloseDetails = () => set({ id: null });

  const handleCreate = async (values: any) => {
    try {
      const created = await createCustomer(values);
      setCustomers((prev) => [created, ...prev]);
      setCreateOpen(false);
      toast({ title: "Customer created", description: created.name || created.email });
      set({ id: created.id }); // open drawer to new profile
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.message || "Could not create customer.",
        variant: "destructive",
      });
    }
  };

  // rendering
  return (
    <AppShell title="Customers">
      {/* Header row */}
      <div className="container mx-auto px-6 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your customers and their dietary preferences.
        </p>
      </div>

      {/* Toolbar */}
      <div className="container mx-auto px-6 mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 w-full md:max-w-lg" role="search" aria-label="Search customers">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search customers..."
                value={url.q}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CustomerFilters
              status={url.status}
              tags={url.tags}
              allTags={allTags}
              onChange={handleFiltersChange}
            />
            <Tabs value={url.view} onValueChange={(v) => handleViewChange(v as any)}>
              <TabsList>
                <TabsTrigger value="cards" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <ListIcon className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} customer${filtered.length === 1 ? "" : "s"} found`}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Loading skeletons */}
        {loading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          </>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <CustomerListEmpty onAddCustomer={() => setCreateOpen(true)} />
        )}

        {/* Cards view */}
        {!loading && !error && filtered.length > 0 && url.view === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onOpen={(id) => openView(String(id))}
                // onRunMatch, onOpenNotes can be passed if you already wired them
                onRunMatch={(id) => handleOpenDetails(id)}
                onOpenNotes={(id) => openNotes(String(id), c.name)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && !error && filtered.length > 0 && url.view === "list" && (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allergens</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => handleOpenDetails(c.id)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell className="capitalize">{c.status}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {(c.restrictions?.allergens || []).slice(0, 3).join(", ")}
                      {(c.restrictions?.allergens || []).length > 3 ? "…" : ""}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {(c.restrictions?.conditions || []).slice(0, 3).join(", ")}
                      {(c.restrictions?.conditions || []).length > 3 ? "…" : ""}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {(c.tags || []).slice(0, 3).join(", ")}
                      {(c.tags || []).length > 3 ? "…" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => set({ id: String(c.id) })}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>Enter basic info and (optionally) diet & allergens.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            initial={{ status: "active", tags: [], restrictions: { required: [], preferred: [], allergens: [], conditions: [] } }}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Details modal */}
      <CustomerDetailsDialog
        open={!!url.id}
        id={url.id || undefined}
        onOpenChange={(open) => (!open ? handleCloseDetails() : null)}
      />

      <CustomerProfileDialog
        open={viewOpen}
        id={viewId}
        onOpenChange={setViewOpen}
        onDeleted={(id) => {
          setCustomers(prev => prev.filter(c => c.id !== id))
        }}
        onSaved={(updated) => {
          setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
        }}
      />

      <CustomerNotesDialog
        open={notesOpen}
        customerId={notesId}
        customerName={notesName}
        onOpenChange={setNotesOpen}
      />
    </AppShell>
  );
}
