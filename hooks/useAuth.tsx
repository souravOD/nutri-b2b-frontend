"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { account } from "@/lib/appwrite";
import { clearJWT } from "@/lib/jwt";

type User = { $id: string; name?: string | null; email: string } | null;
type Ctx = {
  user: User; loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};
const C = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try { const u = await account.get(); setUser({ $id: u.$id, name: u.name, email: u.email }); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

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
        await account.deleteSession("current").catch(() => {});
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
    await refresh();
  };

  const v = useMemo(() => ({ user, loading, signIn, signUp, signOut, refresh }), [user, loading]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useAuth() { const v = useContext(C); if (!v) throw new Error("useAuth outside provider"); return v; }
