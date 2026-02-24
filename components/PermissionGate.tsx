"use client";

import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { UserRole } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";

type PermissionGateProps = {
    /** Required permission string, e.g. "manage:users" */
    permission?: string;
    /** Alternatively, require the user to have one of these roles */
    roles?: UserRole[];
    /** What to render when the user lacks the permission (default: nothing) */
    fallback?: ReactNode;
    children: ReactNode;
};

/**
 * <PermissionGate> — declarative permission/role gate for JSX trees.
 *
 * Usage:
 *   <PermissionGate permission="manage:users">
 *     <UserManagementPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={["superadmin", "vendor_admin"]} fallback={<AccessDenied />}>
 *     <AdminPanel />
 *   </PermissionGate>
 */
export function PermissionGate({ permission, roles, fallback = null, children }: PermissionGateProps) {
    const { allowed: permAllowed } = usePermission(permission ?? "");
    const { authContext } = useAuth();

    // If a permission was specified, check it
    if (permission) {
        if (!permAllowed) return <>{fallback}</>;
        return <>{children}</>;
    }

    // If roles were specified, check role membership
    if (roles && roles.length > 0) {
        const roleOk =
            authContext.role === "superadmin" || // superadmin always passes
            (authContext.role !== null && roles.includes(authContext.role));
        if (!roleOk) return <>{fallback}</>;
        return <>{children}</>;
    }

    // No constraints specified — render children unconditionally
    return <>{children}</>;
}
