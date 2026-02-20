"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { account, databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { syncSupabaseFromAppwrite } from "@/lib/sync";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
]);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;

  const [ready, setReady] = React.useState(false);
  const ranRef = React.useRef(false);

  const redirectAuthError = React.useCallback(
    (code: string) => {
      router.replace(`/login?auth_error=${encodeURIComponent(code)}`);
    },
    [router]
  );

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        if (isPublic) {
          setReady(true);
          return;
        }

        const DB_ID = `${process.env.NEXT_PUBLIC_APPWRITE_DB_ID ?? ""}`.trim();
        const USERPROFILES_COL = `${process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL ?? ""}`.trim();
        if (!DB_ID || !USERPROFILES_COL) {
          setReady(true);
          return;
        }

        const me = await account.get().catch(() => null);
        if (!me) {
          router.replace("/login");
          return;
        }

        if (!me.emailVerification && pathname !== "/verify") {
          router.replace("/verify");
          return;
        }

        let hasProfile = await userProfileExists(DB_ID, USERPROFILES_COL, me.$id);

        // Attach to existing vendor/team (idempotent) when profile is absent.
        if (!hasProfile) {
          const attachKey = `attach-${me.$id}`;
          if (sessionStorage.getItem(attachKey) !== "1") {
            sessionStorage.setItem(attachKey, "1");
            await fetch("/api/auth/complete-registration", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ userId: me.$id, email: me.email, fullName: me.name }),
            }).catch(() => {});
          }

          hasProfile = await userProfileExists(DB_ID, USERPROFILES_COL, me.$id);
          if (!hasProfile) {
            router.replace("/login?needs_admin_attach=1");
            return;
          }
        }

        // Sync Supabase once per browser session after profile is guaranteed.
        const syncKey = `sb-sync-${me.$id}`;
        if (sessionStorage.getItem(syncKey) !== "1") {
          let synced = await syncSupabaseFromAppwrite();
          if (!synced.ok && synced.code === "invalid_token") {
            // One hard retry handles stale/expired cached JWT races after restart.
            synced = await syncSupabaseFromAppwrite(true);
          }

          if (synced.ok) {
            sessionStorage.setItem(syncKey, "1");
          } else {
            sessionStorage.removeItem(syncKey);
            redirectAuthError(synced.code);
            return;
          }
        }

        setReady(true);
      } catch {
        setReady(true);
      }
    };

    run();
  }, [isPublic, pathname, router, redirectAuthError]);

  if (isPublic) return <>{children}</>;
  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>;
  return <>{children}</>;
}

async function userProfileExists(DB_ID: string, USERPROFILES_COL: string, userId: string) {
  try {
    const res = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
      Query.equal("user_id", userId),
      Query.limit(1),
    ]);
    return res.total > 0;
  } catch {
    return false;
  }
}
