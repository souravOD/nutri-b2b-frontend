/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import * as XLSX from "xlsx";
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
import { Search, Plus, Grid3X3, List as ListIcon, UserCheck, UserX, Download, Upload, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/backend";
import { trackEvent } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { UICustomer } from "@/types/customer";
import { listCustomers } from "@/lib/api-customers";

import CustomerCard from "@/components/customers/CustomerCard";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerListEmpty from "@/components/customers/CustomerListEmpty";
import AddCustomerDialog from "@/components/customers/AddCustomerDialog";
import { PermissionGate } from "@/components/PermissionGate";

/** URL param helpers */
type SegmentFilter = "all" | "with_profile" | "no_profile";
type EngagementFilter = "all" | "high" | "medium" | "low";

type ParamState = {
  q?: string | null;
  status?: "all" | "active" | "archived" | null;
  tags?: string[] | null; // stored as CSV in URL
  view?: "cards" | "list" | null;
  segment?: SegmentFilter | null;
  engagement?: EngagementFilter | null;
};

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((): { q: string; status: "all" | "active" | "archived"; tags: string[]; view: "cards" | "list"; segment: SegmentFilter; engagement: EngagementFilter } => {
    const q = searchParams.get("q") ?? "";
    const status = (searchParams.get("status") as "all" | "active" | "archived") || "all";
    const tagsCsv = searchParams.get("tags") || "";
    const tags = tagsCsv ? tagsCsv.split(",").filter(Boolean) : [];
    const view = (searchParams.get("view") as "cards" | "list") || "cards";
    const segment = (searchParams.get("segment") as SegmentFilter) || "all";
    const engagement = (searchParams.get("engagement") as EngagementFilter) || "all";
    return { q, status, tags, view, segment, engagement };
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
  useToast();
  const router = useRouter();
  const { get, set } = useUrlState();

  // data
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<UICustomer[]>([]);
  // UI state
  const [addOpen, setAddOpen] = React.useState(false);
  const url = get();

  // CSV import state
  const [importOpen, setImportOpen] = React.useState(false);
  const [importRows, setImportRows] = React.useState<Record<string, string>[]>([]);
  const [importFileName, setImportFileName] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{ inserted: number; updated: number; errors: any[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function navigateToDetail(id: string) { router.push(`/customers/${id}`) }

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImportFileName(file.name);
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        if (rows.length === 0) {
          setImportError("No data rows found.");
          setImportRows([]);
        } else {
          setImportRows(rows);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setImportError("No data rows found. Check the file has a header row and at least one data row.");
          setImportRows([]);
        } else {
          setImportRows(rows);
        }
      };
      reader.readAsText(file);
    }
  }

  async function handleImportConfirm() {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await apiFetch("/api/v1/customers/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: importRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Import failed");
      setImportResult({ inserted: data.inserted ?? 0, updated: data.updated ?? 0, errors: data.errors ?? [] });
    } catch (err: any) {
      setImportError(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function resetImportDialog() {
    setImportRows([]);
    setImportFileName("");
    setImportError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  React.useEffect(() => { trackEvent("page_view", { page: "customers" }); }, []);

  // load customers — re-fetches when segment/engagement filters change (server-side)
  const { segment, engagement, status } = url;
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    listCustomers({
      segment: segment !== "all" ? segment : undefined,
      engagement: engagement !== "all" ? engagement : undefined,
      status: status !== "all" ? status : undefined,
      limit: 200,
    })
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
  }, [segment, engagement, status]);

  // derived: all tags present in the list
  const allTags = React.useMemo(() => {
    const s = new Set<string>();
    customers.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  // filtering (client-side for q/tags; segment/engagement/status handled by backend)
  const filtered = React.useMemo(() => {
    const q = url.q.trim().toLowerCase();
    const tags = new Set(url.tags);

    return customers.filter((c) => {
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  trackEvent("members_export", { format: "csv" });
                  const a = document.createElement("a");
                  a.href = "/api/v1/customers/export";
                  a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                }}>
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  trackEvent("members_export", { format: "xlsx" });
                  const a = document.createElement("a");
                  a.href = "/api/v1/customers/export?format=xlsx";
                  a.download = `members-${new Date().toISOString().slice(0, 10)}.xlsx`;
                  a.click();
                }}>
                  Export XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <PermissionGate permission="write:customers">
              <Button
                variant="outline"
                className="border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"
                onClick={() => { resetImportDialog(); setImportOpen(true); }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </PermissionGate>
            <PermissionGate permission="write:customers">
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-primary hover:bg-[#003366] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Controls Bar: Search + status toggle + Quick Filters (horizontal per Figma) */}
        <div className="flex flex-row flex-nowrap items-center gap-4 overflow-x-auto pb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md shrink-0" role="search" aria-label="Search customers">
            <div className="relative w-full min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <Input
                className="pl-9 bg-[#f8fafc] rounded-lg border-[#e2e8f0] focus-visible:ring-2 focus-visible:ring-primary/30"
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
                <TabsTrigger value="cards" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary">
                  <Grid3X3 className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-primary">
                  <ListIcon className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Segment filter row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#64748b]">Segment:</span>
          {(["all", "with_profile", "no_profile"] as SegmentFilter[]).map((seg) => {
            const labels: Record<SegmentFilter, { label: string; icon: React.ReactNode }> = {
              all: { label: "All", icon: null },
              with_profile: { label: "With Health Profile", icon: <UserCheck className="h-3.5 w-3.5" /> },
              no_profile: { label: "No Profile", icon: <UserX className="h-3.5 w-3.5" /> },
            };
            const isActive = url.segment === seg;
            return (
              <Button
                key={seg}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`h-7 px-3 text-xs gap-1.5 ${isActive ? "bg-primary text-white hover:bg-[#003366]" : "border-[#e2e8f0] text-[#64748b]"}`}
                onClick={() => { set({ segment: seg }); trackEvent("members_filter", { filter_type: "segment", value: seg }); }}
              >
                {labels[seg].icon}
                {labels[seg].label}
              </Button>
            );
          })}
        </div>

        {/* Engagement filter row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#64748b]">Engagement:</span>
          {(["all", "high", "medium", "low"] as EngagementFilter[]).map((eng) => {
            const meta: Record<EngagementFilter, { label: string; dot: string }> = {
              all:    { label: "All",    dot: "" },
              high:   { label: "High",   dot: "bg-[#10b981]" },
              medium: { label: "Medium", dot: "bg-[#f59e0b]" },
              low:    { label: "Low",    dot: "bg-[#94a3b8]" },
            };
            const isActive = url.engagement === eng;
            return (
              <Button
                key={eng}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`h-7 px-3 text-xs gap-1.5 ${isActive ? "bg-primary text-white hover:bg-[#003366]" : "border-[#e2e8f0] text-[#64748b]"}`}
                onClick={() => { set({ engagement: eng }); trackEvent("members_filter", { filter_type: "engagement", value: eng }); }}
              >
                {meta[eng].dot && <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${meta[eng].dot}`} />}
                {meta[eng].label}
              </Button>
            );
          })}
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
                      {(c.tags || []).slice(0, 3).join(", ")}
                      {(c.tags || []).length > 3 ? "…" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigateToDetail(c.id); }}
                        className="text-primary hover:text-[#003366] hover:bg-primary/10"
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

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) resetImportDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Customers from CSV</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Column guide */}
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs text-[#64748b]">
              <p className="font-semibold text-[#475569] mb-1">Expected columns (first row must be header):</p>
              <p className="font-mono">external_id, full_name, email, dob, age, gender, phone</p>
              <p className="mt-1">Only <strong>external_id</strong> is required. All other columns are optional.</p>
            </div>

            {/* File picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                className="border-[#e2e8f0] text-[#475569]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importFileName || "Choose CSV file…"}
              </Button>
            </div>

            {/* Error */}
            {importError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {importError}
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>Import complete — <strong>{importResult.inserted}</strong> inserted, <strong>{importResult.updated}</strong> updated.</p>
                  {importResult.errors.length > 0 && (
                    <p className="mt-1 text-amber-700">{importResult.errors.length} row(s) had errors.</p>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            {importRows.length > 0 && !importResult && (
              <div>
                <p className="text-sm text-[#64748b] mb-2">
                  Preview — showing first 5 of <strong>{importRows.length}</strong> rows
                </p>
                <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(importRows[0]).map((h) => (
                          <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((v, j) => (
                            <TableCell key={j} className="text-xs max-w-[120px] truncate">{v}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            {!importResult && (
              <Button
                disabled={importRows.length === 0 || importing}
                onClick={handleImportConfirm}
                className="bg-primary hover:bg-[#003366] text-white"
              >
                {importing ? "Importing…" : `Confirm Import (${importRows.length} rows)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
