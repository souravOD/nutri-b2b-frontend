"use client";

import * as React from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import { apiFetch } from "@/lib/backend";
import { useAuth } from "@/hooks/useAuth";
import { teams } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/use-toast";
import { Users, UserPlus, Shield, Mail, Crown, ChevronDown, ChevronUp, Pencil, Building2, Search, Filter, Send } from "lucide-react";

type VendorOption = {
    id: string;
    name: string;
    slug: string;
};

type UserLink = {
    userId: string;
    email: string;
    role: string;
    status: string;
    displayName?: string;
    linkedAt?: string;
    membershipExpiresAt?: string | null;
};



const ROLE_LABELS: Record<string, string> = {
    vendor_admin: "Admin",
    vendor_operator: "Operator",
    vendor_viewer: "Viewer",
    wellness_manager: "Wellness Manager",
    marketing_manager: "Marketing Manager",
    superadmin: "Superadmin",
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    vendor_admin: "default",
    vendor_operator: "secondary",
    vendor_viewer: "outline",
    wellness_manager: "secondary",
    marketing_manager: "secondary",
    superadmin: "destructive",
};

function getInitials(user: UserLink): string {
    if (user.displayName && user.displayName.trim()) {
        const parts = user.displayName.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }
    const email = user.email || "";
    const local = email.split("@")[0] || "";
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return (local[0] || "?").toUpperCase();
}

function getRoleBadgeClassName(role: string): string {
    switch (role) {
        case "vendor_admin":
            return "bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8]";
        case "superadmin":
            return "bg-amber-100 border border-amber-300 text-amber-800";
        default:
            return "bg-[#f1f5f9] border border-[#e2e8f0] text-[#475569]";
    }
}

export default function UserManagementPage() {
    const { authContext } = useAuth();
    const isSuperadmin = authContext.role === "superadmin";
    const { toast } = useToast();

    const [users, setUsers] = React.useState<UserLink[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);
    const [memberSearch, setMemberSearch] = React.useState("");

    // Invite dialog state
    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [invEmail, setInvEmail] = React.useState("");
    const [invRole, setInvRole] = React.useState("vendor_viewer");
    const [invMessage, setInvMessage] = React.useState("");
    const [invVendorId, setInvVendorId] = React.useState("");
    const [invSubmitting, setInvSubmitting] = React.useState(false);
    const [invError, setInvError] = React.useState<string | null>(null);

    // Vendor list for superadmin invites
    const [vendors, setVendors] = React.useState<VendorOption[]>([]);
    const [vendorsLoading, setVendorsLoading] = React.useState(false);

    // Edit role dialog state
    const [editOpen, setEditOpen] = React.useState(false);
    const [editUser, setEditUser] = React.useState<UserLink | null>(null);
    const [editRole, setEditRole] = React.useState("");
    const [editExpiresAt, setEditExpiresAt] = React.useState("");
    const [editSubmitting, setEditSubmitting] = React.useState(false);
    const [editError, setEditError] = React.useState<string | null>(null);

    const fetchUsers = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch("/api/users");
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) {
                throw new Error(body?.detail || body?.message || "Failed to load users.");
            }
            setUsers(Array.isArray(body?.data) ? body.data : []);
        } catch (err: any) {
            setError(err?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Fetch vendor list for superadmin invite selector
    React.useEffect(() => {
        if (!isSuperadmin) return;
        let cancelled = false;
        (async () => {
            setVendorsLoading(true);
            try {
                const res = await apiFetch("/api/vendors");
                if (res.ok) {
                    const body = await res.json();
                    const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
                    if (!cancelled) setVendors(list.map((v: any) => ({ id: v.id || v.$id, name: v.name, slug: v.slug })));
                }
            } catch {
                // Non-fatal
            } finally {
                if (!cancelled) setVendorsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isSuperadmin]);



    async function handlePromote(userId: string) {
        if (!confirm("Promote this user to Superadmin? They will have full platform access.")) return;
        setActionLoading(userId);
        try {
            const res = await apiFetch(`/api/users/${userId}/promote-superadmin`, { method: "POST" });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body?.detail || "Failed to promote user");
            await fetchUsers();
        } catch (err: any) {
            alert(err?.message || "Promotion failed");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDemote(userId: string) {
        if (!confirm("Demote this user from Superadmin to Admin?")) return;
        setActionLoading(userId);
        try {
            const res = await apiFetch(`/api/users/${userId}/demote-superadmin`, { method: "POST" });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body?.detail || "Failed to demote user");
            await fetchUsers();
        } catch (err: any) {
            alert(err?.message || "Demotion failed");
        } finally {
            setActionLoading(null);
        }
    }

    function openEditDialog(user: UserLink) {
        setEditUser(user);
        setEditRole(user.role);
        setEditExpiresAt(
            user.membershipExpiresAt
                ? new Date(user.membershipExpiresAt).toISOString().split("T")[0]
                : ""
        );
        setEditError(null);
        setEditOpen(true);
    }

    async function handleRoleChange() {
        if (!editUser || !editRole) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const payload: Record<string, any> = { role: editRole };
            if (editExpiresAt) {
                payload.membershipExpiresAt = new Date(editExpiresAt).toISOString();
            } else {
                payload.membershipExpiresAt = null;
            }
            const res = await apiFetch(`/api/users/${editUser.userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body?.detail || "Failed to change role");
            toast({ title: "Role updated", description: `${editUser.email} is now ${ROLE_LABELS[editRole] ?? editRole}.` });
            setEditOpen(false);
            await fetchUsers();
        } catch (err: any) {
            setEditError(err?.message || "Failed to update role");
        } finally {
            setEditSubmitting(false);
        }
    }

    function openInviteDialog() {
        setInvEmail("");
        setInvRole("vendor_viewer");
        setInvMessage("");
        setInvVendorId("");
        setInvError(null);
        setInviteOpen(true);
    }

    async function handleInvite() {
        setInvError(null);

        // Client-side validation
        const trimmedEmail = invEmail.trim().toLowerCase();
        if (!trimmedEmail) {
            setInvError("Email address is required.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setInvError("Please enter a valid email address.");
            return;
        }

        setInvSubmitting(true);
        try {
            const res = await apiFetch("/api/invitations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: trimmedEmail,
                    role: invRole,
                    message: invMessage.trim() || undefined,
                    ...(isSuperadmin && invVendorId ? { vendor_id: invVendorId } : {}),

                }),
            });
            const body = await res.json().catch(() => ({} as any));

            if (!res.ok) {
                throw new Error(body?.detail || body?.message || "Failed to send invitation.");
            }

            // Send invitation email via client-side Appwrite
            // When called from the client SDK (with user session), Appwrite
            // sends the invitation email. Server API key auto-accepts silently.
            let emailSent = false;
            const teamId = body.team_id;
            const invToken = body.token;
            if (teamId) {
                try {
                    // Ensure the admin has "owner" role on the team (required by Appwrite)
                    await apiFetch("/api/invitations/promote-to-owner", { method: "POST" });

                    const roleMap: Record<string, string> = {
                        vendor_admin: "admin",
                        vendor_operator: "member",
                        vendor_viewer: "viewer",
                    };
                    const appwriteRole = roleMap[invRole] || "viewer";
                    const acceptUrl = `${window.location.origin}/invite/accept?token=${invToken}`;
                    await teams.createMembership(
                        teamId,
                        [appwriteRole],
                        trimmedEmail,     // email — triggers invitation email
                        undefined,        // userId
                        undefined,        // phone
                        acceptUrl,        // redirect URL in the email
                    );
                    emailSent = true;
                } catch (teamErr: any) {
                    console.warn("Client-side team invite failed:", teamErr?.message);
                }
            }

            const inviteLink = body.invite_link || "";
            if (inviteLink) {
                navigator.clipboard?.writeText(inviteLink).catch(() => { });
            }

            toast({
                title: emailSent ? "Invitation sent!" : "Invitation created",
                description: emailSent
                    ? `An invitation email has been sent to ${trimmedEmail}.`
                    : `Invited ${trimmedEmail}. Invite link copied to clipboard.`,
            });
            setInviteOpen(false);
            await fetchUsers();
        } catch (err: any) {
            setInvError(err?.message || "Something went wrong.");
        } finally {
            setInvSubmitting(false);
        }
    }

    const filteredUsers = React.useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                (u.displayName || "").toLowerCase().includes(q) ||
                (u.email || "").toLowerCase().includes(q)
        );
    }, [users, memberSearch]);

    return (
        <AppShell title="User Management">
            <div className="p-10 space-y-8 bg-[#f8fafc] min-h-screen">
                <Breadcrumb>
                    <BreadcrumbList className="text-[#64748b]">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/dashboard">Portal</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/user-management">User Management</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {inviteOpen && (
                            <>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Invite User</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-[24px] font-bold text-[#0f172a]">User Management</h1>
                        <p className="text-[16px] text-[#475569]">Manage team members, roles, and permissions</p>
                    </div>
                    <Button
                        className="gap-2 bg-[#00438f] hover:bg-[#003366] text-white font-bold rounded-[8px] px-5 py-[10px]"
                        onClick={openInviteDialog}
                    >
                        <UserPlus className="h-4 w-4" />
                        Invite User
                    </Button>
                </div>

                {/* Summary cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[14px] font-medium text-[#64748b]">Total Users</CardTitle>
                            <div className="flex size-[40px] items-center justify-center rounded-[8px] bg-[rgba(0,67,143,0.1)]">
                                <Users className="h-4 w-4 text-[#00438f]" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-[30px] font-bold text-[#0f172a]">{users.length}</div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[14px] font-medium text-[#64748b]">Admins</CardTitle>
                            <div className="flex size-[40px] items-center justify-center rounded-[8px] bg-[#e0e7ff]">
                                <Shield className="h-4 w-4 text-[#4f46e5]" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-[30px] font-bold text-[#0f172a]">
                                {users.filter((u) => u.role === "vendor_admin" || u.role === "superadmin").length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[14px] font-medium text-[#64748b]">Active</CardTitle>
                            <div className="flex size-[40px] items-center justify-center rounded-[8px] bg-[#d1fae5]">
                                <Mail className="h-4 w-4 text-[#059669]" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-[30px] font-bold text-[#0f172a]">
                                {users.filter((u) => u.status === "active").length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Users table */}
                <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
                    <CardHeader className="border-b border-[#f1f5f9] pb-[25px] pt-6 px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-[18px] font-bold text-[#0f172a]">Team Members</CardTitle>
                                <CardDescription className="text-[14px] text-[#64748b]">
                                    All users associated with your vendor account
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative w-[256px] max-w-full">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                                    <Input
                                        placeholder="Search members..."
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        className="h-[42px] w-full max-w-[256px] rounded-[8px] border-[#e2e8f0] bg-[#f8fafc] pl-9"
                                    />
                                </div>
                                <Button variant="outline" className="border-[#e2e8f0] rounded-[8px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filter
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading && (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                Loading users…
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center justify-center py-12 text-destructive">
                                {error}
                            </div>
                        )}

                        {!loading && !error && users.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Users className="h-12 w-12 mb-4 opacity-30" />
                                <p>No users found</p>
                            </div>
                        )}

                        {!loading && !error && users.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc]">
                                        <TableHead className="text-[10px] uppercase text-[#64748b] font-semibold">User</TableHead>
                                        <TableHead className="text-[10px] uppercase text-[#64748b] font-semibold">Role</TableHead>
                                        <TableHead className="text-[10px] uppercase text-[#64748b] font-semibold">Status</TableHead>
                                        <TableHead className="text-[10px] uppercase text-[#64748b] font-semibold">Joined</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase text-[#64748b] font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                No members match your search
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredUsers.map((user) => (
                                                <TableRow key={user.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-medium text-[#475569]">
                                                        {getInitials(user)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{user.displayName || user.email}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getRoleBadgeClassName(user.role)} variant="outline">
                                                    {ROLE_LABELS[user.role] ?? user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.status === "active" ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-2 rounded-full bg-[#10b981]" />
                                                        <span className="text-[#059669] capitalize">{user.status}</span>
                                                    </div>
                                                ) : (
                                                    <Badge
                                                        variant="secondary"
                                                        className={user.status === "invited" ? "bg-amber-100 text-amber-700 border-amber-300" : ""}
                                                    >
                                                        {user.status === "invited" && <Mail className="h-3 w-3 mr-1" />}
                                                        {user.status}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {user.linkedAt
                                                    ? new Date(user.linkedAt).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Hide Edit for superadmins unless current user is superadmin */}
                                                    {(isSuperadmin || user.role !== "superadmin") && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => openEditDialog(user)}
                                                            disabled={actionLoading === user.userId}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                            Edit
                                                        </Button>
                                                    )}
                                                    {isSuperadmin && user.role !== "superadmin" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                                                            onClick={() => handlePromote(user.userId)}
                                                            disabled={actionLoading === user.userId}
                                                        >
                                                            <ChevronUp className="h-3 w-3" />
                                                            {actionLoading === user.userId ? "…" : "Promote"}
                                                        </Button>
                                                    )}
                                                    {isSuperadmin && user.role === "superadmin" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                                            onClick={() => handleDemote(user.userId)}
                                                            disabled={actionLoading === user.userId}
                                                        >
                                                            <ChevronDown className="h-3 w-3" />
                                                            {actionLoading === user.userId ? "…" : "Demote"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                            ))}
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Edit Role Dialog ────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>
                            Update the role for <span className="font-medium">{editUser?.displayName || editUser?.email}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Current Role</label>
                            <Badge variant={ROLE_VARIANT[editUser?.role ?? ""] ?? "outline"}>
                                {ROLE_LABELS[editUser?.role ?? ""] ?? editUser?.role}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Role</label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vendor_admin">Admin — Full management access</SelectItem>
                                    <SelectItem value="vendor_operator">Operator — Data management</SelectItem>
                                    <SelectItem value="vendor_viewer">Viewer — Read-only access</SelectItem>
                                    <SelectItem value="wellness_manager">Wellness Manager — Customer health insights</SelectItem>
                                    <SelectItem value="marketing_manager">Marketing Manager — Analytics &amp; promotions</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Access Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <Input
                                type="date"
                                value={editExpiresAt}
                                onChange={(e) => setEditExpiresAt(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                disabled={editSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">Leave blank for no expiry. Access is automatically revoked after this date.</p>
                        </div>
                        {editError && (
                            <p className="text-sm text-destructive">{editError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleRoleChange} disabled={editSubmitting}>
                            {editSubmitting ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Invite User Dialog ────────────────────────────── */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent
                    className="sm:max-w-[520px] p-0 gap-0 overflow-hidden"
                    overlayClassName="backdrop-blur-[2px] bg-[rgba(15,23,42,0.6)]"
                >
                    <DialogHeader className="px-8 pt-8 pb-4">
                        <DialogTitle className="text-[24px] font-bold text-[#0f172a] leading-8 tracking-[-0.6px]">
                            Invite User
                        </DialogTitle>
                        <DialogDescription className="text-[14px] text-[#64748b] leading-[22.75px]">
                            Send an invitation to a new team member. They will receive an email
                            with a link to join.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-8 py-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="inv-email" className="text-[14px] font-semibold text-[#334155]">
                                Email Address
                            </Label>
                            <Input
                                id="inv-email"
                                type="email"
                                placeholder="colleague@company.com"
                                value={invEmail}
                                onChange={(e) => setInvEmail(e.target.value)}
                                disabled={invSubmitting}
                                autoFocus
                                className="bg-[#f8fafc] border-[#e2e8f0] rounded-[8px] h-[46px] px-4 py-3"
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-1.5">
                            <Label htmlFor="inv-role" className="text-[14px] font-semibold text-[#334155]">
                                Role
                            </Label>
                            <Select value={invRole} onValueChange={setInvRole} disabled={invSubmitting}>
                                <SelectTrigger id="inv-role" className="w-full bg-[#f8fafc] border-[#e2e8f0] rounded-[8px] h-[46px]">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vendor_admin">Admin — Full management access</SelectItem>
                                    <SelectItem value="vendor_operator">Operator — Can manage data &amp; products</SelectItem>
                                    <SelectItem value="vendor_viewer">Viewer — Read-only access</SelectItem>
                                    <SelectItem value="wellness_manager">Wellness Manager — Customer health insights</SelectItem>
                                    <SelectItem value="marketing_manager">Marketing Manager — Analytics &amp; promotions</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vendor (superadmin only) */}
                        {isSuperadmin && (
                            <div className="space-y-1.5">
                                <Label htmlFor="inv-vendor" className="text-[14px] font-semibold text-[#334155]">
                                    Vendor (optional)
                                </Label>
                                <Select value={invVendorId} onValueChange={setInvVendorId} disabled={invSubmitting || vendorsLoading}>
                                    <SelectTrigger id="inv-vendor" className="w-full bg-[#f8fafc] border-[#e2e8f0] rounded-[8px] h-[46px]">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-[#64748b]" />
                                            <SelectValue placeholder={vendorsLoading ? "Loading vendors…" : "Select a vendor (optional)"} />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.name} <span className="text-muted-foreground">({v.slug})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-[#64748b]">
                                    Leave empty to invite to your current vendor.
                                </p>
                            </div>
                        )}
                        {/* Message (optional) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="inv-message" className="text-[14px] font-semibold text-[#334155]">
                                Message (optional)
                            </Label>
                            <Textarea
                                id="inv-message"
                                placeholder="Hey, join our vendor team..."
                                value={invMessage}
                                onChange={(e) => setInvMessage(e.target.value)}
                                disabled={invSubmitting}
                                rows={3}
                                className="bg-[#f8fafc] border-[#e2e8f0] rounded-[8px] resize-none"
                            />
                        </div>

                        {/* Error */}
                        {invError && (
                            <p className="text-sm text-destructive">{invError}</p>
                        )}
                    </div>

                    <DialogFooter className="bg-[#f8fafc] px-8 py-6 gap-3 border-t border-[#e2e8f0]">
                        <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={invSubmitting} className="font-bold text-[#475569]">
                            Cancel
                        </Button>
                        <Button onClick={handleInvite} disabled={invSubmitting} className="gap-2 bg-[#00438f] hover:bg-[#003366] text-white font-bold shadow-[0px_10px_15px_-3px_rgba(0,67,143,0.2),0px_4px_6px_-4px_rgba(0,67,143,0.2)]">
                            <Send className="h-4 w-4" />
                            {invSubmitting ? "Sending…" : "Send Invitation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
