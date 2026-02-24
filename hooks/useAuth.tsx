"use client";
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/appwrite";
import { clearJWT } from "@/lib/jwt";
import { apiFetch } from "@/lib/backend";

export type UserRole = "superadmin" | "vendor_admin" | "vendor_operator" | "vendor_viewer";

type User = { $id: string; name?: string | null; email: string } | null;

type AuthContextData = {
  role: UserRole | null;
  permissions: string[];
  vendorId: string | null;
};

type Ctx = {
  user: User;
  loading: boolean;
  /** Role / permission data from the backend (null while loading) */
  authContext: AuthContextData;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};
const C = createContext<Ctx | null>(null);

const EMPTY_CTX: AuthContextData = { role: null, permissions: [], vendorId: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContextData>(EMPTY_CTX);

  // Fetch role / permissions from the backend
  const fetchAuthContext = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/context");
      if (res.ok) {
        const data = await res.json();
        setAuthContext({
          role: data.role ?? null,
          permissions: data.permissions ?? [],
          vendorId: data.vendorId ?? null,
        });
      } else {
        // Not linked yet, or other issue — stay with empty context
        setAuthContext(EMPTY_CTX);
      }
    } catch {
      setAuthContext(EMPTY_CTX);
    }
  }, []);

  async function refresh() {
    try {
      const u = await account.get();
      setUser({ $id: u.$id, name: u.name, email: u.email });
    } catch {
      setUser(null);
      setAuthContext(EMPTY_CTX);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Appwrite user on mount
  useEffect(() => { refresh(); }, []);

  // When user changes, fetch their auth context from the backend
  useEffect(() => {
    if (user) {
      fetchAuthContext();
    } else {
      setAuthContext(EMPTY_CTX);
    }
  }, [user, fetchAuthContext]);

  const signIn = async (email: string, password: string) => {
    const wantedEmail = email.trim().toLowerCase();
    try {
      await account.createEmailPasswordSession(email, password);
    } catch (err: any) {
      const type = String(err?.type || "");
      const msg = String(err?.message || "");
      const alreadyHasSession =
        type === "user_session_already_exists" || /session is active/i.test(msg);

      if (!alreadyHasSession) throw err;

      // Reuse active session if it belongs to the same account.
      const existing = await account.get().catch(() => null);
      const existingEmail = String(existing?.email || "").trim().toLowerCase();
      if (!existing || (wantedEmail && existingEmail && existingEmail !== wantedEmail)) {
        // Active session belongs to another account; replace it.
        await account.deleteSession("current").catch(() => { });
        await account.createEmailPasswordSession(email, password);
      }
    }
    // Force JWT recache from the active Appwrite session.
    clearJWT();
    await refresh();
  };

  const signUp = async (name: string, email: string, password: string) => {
    await account.create("unique()", email, password, name);
    await account.createEmailPasswordSession(email, password);
    await refresh();
  };

  const signOut = async () => {
    await account.deleteSession("current");
    clearJWT();
    setAuthContext(EMPTY_CTX);
    await refresh();
  };

  const v = useMemo(
    () => ({ user, loading, authContext, signIn, signUp, signOut, refresh }),
    [user, loading, authContext]
  );
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useAuth() {
  const v = useContext(C);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
