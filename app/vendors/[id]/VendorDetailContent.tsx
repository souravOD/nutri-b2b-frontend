"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Users,
  Store,
  Copy,
  Pencil,
  ShieldOff,
  ShieldCheck,
  Briefcase,
  Bell,
  Shield,
  User,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const QUICK_ACCESS_LINKS = [
  { href: "/products", label: "Products", subtitle: "Manage catalog", icon: Package },
  { href: "/customers", label: "Customers", subtitle: "View assignments", icon: Users },
  { href: "/jobs", label: "Jobs", subtitle: "Data pipelines", icon: Briefcase },
  { href: "/alerts", label: "Alerts", subtitle: "System health", icon: Bell },
  { href: "/compliance", label: "Compliance", subtitle: "SLA & legal", icon: Shield },
  { href: "/user-management", label: "Users", subtitle: "Team access", icon: User },
  { href: "/settings", label: "Vendor Settings", subtitle: "Configure global vendor parameters", icon: Settings, fullWidth: true },
] as const;

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium uppercase tracking-[0.6px] bg-[#dcfce7] text-[#15803d]">
        Active
      </span>
    );
  }
  if (s === "suspended") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium uppercase tracking-[0.6px] bg-red-100 text-red-700">
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium uppercase tracking-[0.6px] bg-gray-100 text-gray-600">
      {status || "Inactive"}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { toast } = useToast();
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Copied to clipboard" }),
      () => toast({ title: "Copy failed", variant: "destructive" })
    );
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy} aria-label={`Copy ${label}`}>
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

export type VendorDetailContentProps = {
  vendor: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    vendorType: string | null;
    contactEmail: string | null;
    billingEmail: string | null;
    teamId: string | null;
    domains: string[] | null;
    apiEndpoint: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  stats: {
    productCount: number;
    userCount: number;
    customerCount: number;
    lastIngestion: string | null;
  };
  id: string;
  editOpen: boolean;
  setEditOpen: (v: boolean) => void;
  editName: string;
  setEditName: (v: string) => void;
  editContactEmail: string;
  setEditContactEmail: (v: string) => void;
  editBillingEmail: string;
  setEditBillingEmail: (v: string) => void;
  editDomains: string;
  setEditDomains: (v: string) => void;
  editApiEndpoint: string;
  setEditApiEndpoint: (v: string) => void;
  editSaving: boolean;
  openEdit: () => void;
  saveEdit: () => Promise<void>;
  handleSuspend: () => Promise<void>;
  handleReactivate: () => Promise<void>;
};

export function VendorDetailContent(props: VendorDetailContentProps) {
  const {
    vendor,
    stats,
    id,
    editOpen,
    setEditOpen,
    editName,
    setEditName,
    editContactEmail,
    setEditContactEmail,
    editBillingEmail,
    setEditBillingEmail,
    editDomains,
    setEditDomains,
    editApiEndpoint,
    setEditApiEndpoint,
    editSaving,
    openEdit,
    saveEdit,
    handleSuspend,
    handleReactivate,
  } = props;
  const firstLetter = (vendor.name || "?").charAt(0).toUpperCase();
  const isSuspended = (vendor.status || "").toLowerCase() === "suspended";

  return (
    <div>
      <div className="-mx-4 md:-mx-6 -mt-4 bg-[#f8fafc] min-h-screen pt-4">
        <div className="flex flex-col gap-[32px] p-10 md:p-[40px]">
          <Breadcrumb>
            <BreadcrumbList className="text-[#64748b]">
              <BreadcrumbItem>
                <BreadcrumbLink href="/vendors/manage">Vendors</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-[#0f172a]">{vendor.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px] flex flex-wrap items-center gap-4">
            <div
              className="flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-[12px] text-2xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(0, 67, 143) 100%)" }}
            >
              {firstLetter}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[30px] font-bold text-[#0f172a]">{vendor.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <StatusBadge status={vendor.status} />
                {vendor.slug && (
                  <span className="inline-flex items-center rounded-[4px] bg-[#f1f5f9] px-2 py-0.5 font-mono text-sm text-primary">
                    {vendor.slug}
                  </span>
                )}
                {vendor.vendorType && (
                  <span className="inline-flex items-center gap-1 text-[14px] text-[#64748b]">
                    <Store className="h-4 w-4" />
                    {String(vendor.vendorType).charAt(0).toUpperCase() + String(vendor.vendorType).slice(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-1" /> Edit Vendor
              </Button>
              {isSuspended ? (
                <Button variant="outline" size="sm" onClick={handleReactivate}>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Reactivate
                </Button>
              ) : (
                <Button size="sm" className="bg-primary hover:bg-[#003366] text-white" onClick={handleSuspend}>
                  <ShieldOff className="h-4 w-4 mr-1" /> Suspend Vendor
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
              <p className="text-[14px] font-medium text-[#64748b]">Products</p>
              <p className="text-[30px] font-bold text-[#0f172a]">{stats.productCount}</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
              <p className="text-[14px] font-medium text-[#64748b]">Users</p>
              <p className="text-[30px] font-bold text-[#0f172a]">{stats.userCount}</p>
              <p className="text-[12px] font-medium text-[#94a3b8]">Active Admins</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
              <p className="text-[14px] font-medium text-[#64748b]">Customers</p>
              <p className="text-[30px] font-bold text-[#0f172a]">{stats.customerCount}</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-[25px]">
              <p className="text-[14px] font-medium text-[#64748b]">Last Ingestion</p>
              <p className="text-[30px] font-bold text-[#0f172a]">
                {stats.lastIngestion ? format(new Date(stats.lastIngestion), "MMM d, yyyy") : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px] items-start">
            <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="border-b border-[#f1f5f9] py-4 px-6 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#0f172a]">Vendor Profile Information</h2>
                <button type="button" onClick={openEdit} className="text-[14px] font-semibold text-primary hover:underline">
                  Update details
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Billing Email</p>
                    <p className="text-[14px] font-medium text-[#0f172a]">{vendor.billingEmail || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Contact Email</p>
                    <p className="text-[14px] font-medium text-[#0f172a]">{vendor.contactEmail || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Team ID</p>
                    <div className="flex items-center gap-1">
                      <code className="text-[14px] font-medium bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2 py-1 font-mono text-[#0f172a]">
                        {vendor.teamId || "—"}
                      </code>
                      {vendor.teamId && <CopyButton text={vendor.teamId} label="Team ID" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Domains</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(vendor.domains) ? vendor.domains : []).length > 0
                        ? (vendor.domains as string[]).map((d) => (
                            <span key={d} className="inline-flex rounded-[4px] bg-[#f1f5f9] px-2 py-0.5 text-[14px] font-medium text-[#0f172a]">
                              {d}
                            </span>
                          ))
                        : <span className="text-[14px] font-medium text-[#0f172a]">—</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">API Endpoint</p>
                  <div className="flex items-center gap-1">
                    <code className="text-[14px] font-medium bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] px-2 py-1 font-mono text-[#0f172a] truncate max-w-full">
                      {vendor.apiEndpoint || "—"}
                    </code>
                    {vendor.apiEndpoint && <CopyButton text={vendor.apiEndpoint} label="API Endpoint" />}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Created Date</p>
                    <p className="text-[14px] font-medium text-[#0f172a]">
                      {vendor.createdAt ? format(new Date(vendor.createdAt), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-[1.2px] text-[#94a3b8] font-bold mb-1">Last Updated Date</p>
                    <p className="text-[14px] font-medium text-[#0f172a]">
                      {vendor.updatedAt ? format(new Date(vendor.updatedAt), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[16px] font-bold text-[#0f172a] mb-4">Quick Access</h2>
              <div className="grid grid-cols-2 gap-4">
                {QUICK_ACCESS_LINKS.map(({ href, label, subtitle, icon: Icon, fullWidth }) => (
                  <Link
                    key={href}
                    href={`${href}?vendorId=${id}`}
                    className={`flex flex-col items-start gap-2 bg-white border border-[#e2e8f0] rounded-[12px] p-4 hover:bg-[#f8fafc] transition-colors ${fullWidth ? "lg:col-span-2" : ""}`}
                  >
                    <Icon className="h-5 w-5 text-[#64748b]" />
                    <div className="flex-1 w-full flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-bold text-[#0f172a]">{label}</p>
                        <p className="text-[12px] text-[#64748b]">{subtitle}</p>
                      </div>
                      {fullWidth && <ChevronRight className="h-4 w-4 text-[#64748b] shrink-0" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor details. Changes are saved to Supabase and Appwrite.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Email</Label>
              <Input id="edit-contact" type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-billing">Billing Email</Label>
              <Input id="edit-billing" type="email" value={editBillingEmail} onChange={(e) => setEditBillingEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-domains">Domains (comma-separated)</Label>
              <Input id="edit-domains" value={editDomains} onChange={(e) => setEditDomains(e.target.value)} placeholder="example.com, example.org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-api">API Endpoint</Label>
              <Input id="edit-api" value={editApiEndpoint} onChange={(e) => setEditApiEndpoint(e.target.value)} placeholder="https://api.example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving} className="bg-primary hover:bg-[#003366] text-white">{editSaving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
