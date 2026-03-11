"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { listCustomers } from "@/lib/api-customers";

import CustomerCard from "@/components/customers/CustomerCard";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerListEmpty from "@/components/customers/CustomerListEmpty";
import AddCustomerDialog from "@/components/customers/AddCustomerDialog";

/** URL param helpers */
type ParamState = {
  q?: string | null;
  status?: "all" | "active" | "archived" | null;
  tags?: string[] | null; // stored as CSV in URL
  view?: "cards" | "list" | null;
};

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((): { q: string; status: "all" | "active" | "archived"; tags: string[]; view: "cards" | "list" } => {
    const q = searchParams.get("q") ?? "";
    const status = (searchParams.get("status") as "all" | "active" | "archived") || "all";
    const tagsCsv = searchParams.get("tags") || "";
    const tags = tagsCsv ? tagsCsv.split(",").filter(Boolean) : [];
    const view = (searchParams.get("view") as "cards" | "list") || "cards";
    return { q, status, tags, view };
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
  const router = useRouter();
  const { get, set } = useUrlState();

  // data
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<UICustomer[]>([]);
  // UI state
  const [addOpen, setAddOpen] = React.useState(false);
  const url = get();

  function navigateToDetail(id: string) { router.push(`/customers/${id}`) }

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

  // rendering
  return (
    <AppShell title="Customers">
      {/* Header row - Figma aligned: Breadcrumbs, Title, Subtitle, Add Customer */}
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList className="text-[#64748b]">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Portal</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Customers</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0f172a]">Customers</h1>
            <p className="mt-1 text-sm text-[#64748b]">
              {loading ? "Loading…" : `${filtered.length} total records found in database`}
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-[#00438f] hover:bg-[#003366] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Controls Bar: Search + status toggle + Quick Filters (horizontal per Figma) */}
        <div className="flex flex-row flex-nowrap items-center gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md shrink-0" role="search" aria-label="Search customers">
            <div className="relative w-full min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <Input
                className="pl-9 bg-[#f8fafc] rounded-lg border-[#e2e8f0] focus-visible:ring-2 focus-visible:ring-[#00438f]/30"
                placeholder="Search by name, email or ID..."
                value={url.q}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-nowrap shrink-0">
            <CustomerFilters
              status={url.status}
              tags={url.tags}
              allTags={allTags}
              onChange={handleFiltersChange}
            />
            <Tabs value={url.view} onValueChange={(v) => handleViewChange(v as any)} className="shrink-0">
              <TabsList className="bg-[#f1f5f9] inline-flex">
                <TabsTrigger value="cards" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#00438f]">
                  <Grid3X3 className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#00438f]">
                  <ListIcon className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="mt-6">
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
          <CustomerListEmpty onAddCustomer={() => setAddOpen(true)} />
        )}

        {/* Cards view */}
        {!loading && !error && filtered.length > 0 && url.view === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onOpen={(id) => navigateToDetail(String(id))}
                onRunMatch={(id) => navigateToDetail(String(id))}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && !error && filtered.length > 0 && url.view === "list" && (
          <div className="rounded-xl border border-[#e2e8f0] bg-card shadow-sm overflow-hidden">
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
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigateToDetail(c.id)}>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigateToDetail(c.id); }}
                        className="text-[#00438f] hover:text-[#003366] hover:bg-[#00438f]/10"
                      >
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

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  );
}
