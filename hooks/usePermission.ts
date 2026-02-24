"use client";

import { useMemo } from "react";
import { useAuth } from "./useAuth";

/**
 * usePermission — check whether the current user holds a specific permission.
 *
 * Returns `{ allowed, role, loading }`.
 *  - `allowed` is true when the user's permissions include the requested one
 *    (or the user has wildcard `*`).
 *  - While auth is still loading, `allowed` is `false` and `loading` is `true`.
 *
 * Usage:
 *   const { allowed } = usePermission("manage:users");
 *   if (!allowed) return <Unauthorized />;
 */
export function usePermission(permission: string) {
    const { authContext, loading } = useAuth();

    const allowed = useMemo(() => {
        if (!authContext.role) return false;
        if (authContext.permissions.includes("*")) return true;
        return authContext.permissions.includes(permission);
    }, [authContext, permission]);

    return { allowed, role: authContext.role, loading };
}

/**
 * useHasAnyPermission — check whether the current user holds at least one
 * of the listed permissions.
 */
export function useHasAnyPermission(...perms: string[]) {
    const { authContext, loading } = useAuth();

    const allowed = useMemo(() => {
        if (!authContext.role) return false;
        if (authContext.permissions.includes("*")) return true;
        return perms.some((p) => authContext.permissions.includes(p));
    }, [authContext, perms]);

    return { allowed, role: authContext.role, loading };
}
