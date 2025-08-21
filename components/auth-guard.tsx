"use client"

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { account, databases } from "@/lib/appwrite";
import { Query } from "appwrite";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
]);

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!;
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  const isPublic = pathname ? PUBLIC_PATHS.has(pathname) : false;
  const isOnboarding = pathname === "/onboarding";

  React.useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        if (isPublic) return;

        const me = await account.get().catch(() => null);
        if (!me) { router.replace("/login"); return; }

        if (!me.emailVerification && pathname !== "/verify") {
          router.replace("/verify"); return;
        }

        if (isOnboarding) return; // allow onboarding page to run its creation

        // If no user_profile exists yet, force onboarding
        try {
          const profs = await databases.listDocuments(DB_ID, USERPROFILES_COL, [
            Query.equal("user_id", me.$id),
            Query.limit(1),
          ]);
          if (profs.total === 0) { router.replace("/onboarding"); return; }
        } catch {
          // If listing profiles fails due to perms, be safe and send to onboarding
          router.replace("/onboarding"); return;
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [pathname, router, isPublic, isOnboarding]);

  if (isPublic) return <>{children}</>;
  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  return <>{children}</>;
}
