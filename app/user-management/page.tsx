"use client";

import * as React from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { Users, UserPlus, Shield, Mail, Crown, ChevronDown, ChevronUp, Pencil, Building2 } from "lucide-react";

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
};



const ROLE_LABELS: Record<string, string> = {
    vendor_admin: "Admin",
    vendor_operator: "Operator",
    vendor_viewer: "Viewer",
    superadmin: "Superadmin",
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    vendor_admin: "default",
    vendor_operator: "secondary",
    vendor_viewer: "outline",
    superadmin: "destructive",
};

export default function UserManagementPage() {
    const { authContext } = useAuth();
    const isSuperadmin = authContext.role === "superadmin";
    const { toast } = useToast();

    const [users, setUsers] = React.useState<UserLink[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

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
        setEditError(null);
        setEditOpen(true);
    }

    async function handleRoleChange() {
        if (!editUser || !editRole) return;
        if (editRole === editUser.role) {
            setEditOpen(false);
            return;
        }
        setEditSubmitting(true);
        setEditError(null);
        try {
            const res = await apiFetch(`/api/users/${editUser.userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: editRole }),
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

    return (
        <AppShell title="User Management">
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                        <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
                    </div>
                    <Button className="gap-2" onClick={openInviteDialog}>
                        <UserPlus className="h-4 w-4" />
                        Invite User
                    </Button>
                </div>

                {/* Summary cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {users.filter((u) => u.role === "vendor_admin" || u.role === "superadmin").length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {users.filter((u) => u.status === "active").length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Users table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                            All users associated with your vendor account
                        </CardDescription>
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
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {user.role === "superadmin" && (
                                                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{user.displayName || user.email}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ROLE_VARIANT[user.role] ?? "outline"}>
                                                    {ROLE_LABELS[user.role] ?? user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.status === "active" ? "default" : "secondary"}
                                                    className={user.status === "invited" ? "bg-amber-100 text-amber-700 border-amber-300" : ""}
                                                >
                                                    {user.status === "invited" && <Mail className="h-3 w-3 mr-1" />}
                                                    {user.status}
                                                </Badge>
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
                                </SelectContent>
                            </Select>
                        </div>
                        {editError && (
                            <p className="text-sm text-destructive">{editError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleRoleChange} disabled={editSubmitting || editRole === editUser?.role}>
                            {editSubmitting ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Invite User Dialog ────────────────────────────── */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Invite User</DialogTitle>
                        <DialogDescription>
                            Send an invitation to a new team member. They will receive an email with a link to join.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="inv-email">Email address</Label>
                            <Input
                                id="inv-email"
                                type="email"
                                placeholder="colleague@company.com"
                                value={invEmail}
                                onChange={(e) => setInvEmail(e.target.value)}
                                disabled={invSubmitting}
                                autoFocus
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="inv-role">Role</Label>
                            <Select value={invRole} onValueChange={setInvRole} disabled={invSubmitting}>
                                <SelectTrigger id="inv-role">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vendor_admin">Admin — Full management access</SelectItem>
                                    <SelectItem value="vendor_operator">Operator — Can manage data &amp; products</SelectItem>
                                    <SelectItem value="vendor_viewer">Viewer — Read-only access</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vendor (superadmin only) */}
                        {isSuperadmin && (
                            <div className="space-y-2">
                                <Label htmlFor="inv-vendor">Vendor</Label>
                                <Select value={invVendorId} onValueChange={setInvVendorId} disabled={invSubmitting || vendorsLoading}>
                                    <SelectTrigger id="inv-vendor">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
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
                                <p className="text-xs text-muted-foreground">
                                    Leave empty to invite to your current vendor.
                                </p>
                            </div>
                        )}
                        {/* Message (optional) */}
                        <div className="space-y-2">
                            <Label htmlFor="inv-message">
                                Message <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                id="inv-message"
                                placeholder="Hey, join our vendor team…"
                                value={invMessage}
                                onChange={(e) => setInvMessage(e.target.value)}
                                disabled={invSubmitting}
                                rows={3}
                            />
                        </div>

                        {/* Error */}
                        {invError && (
                            <p className="text-sm text-destructive">{invError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={invSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleInvite} disabled={invSubmitting} className="gap-2">
                            <Mail className="h-4 w-4" />
                            {invSubmitting ? "Sending…" : "Send Invitation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
