"use client"

import * as React from "react"
import { account, databases } from "@/lib/appwrite"
import { Query } from "appwrite"

type Tenant = {
  userId: string
  vendorId: string
  vendorSlug: string
  vendorName: string
  role: "admin" | "operator"
}

type Ctx = {
  tenant: Tenant | null
  loading: boolean
  refresh: () => Promise<void>
}

const TenantCtx = React.createContext<Ctx>({ tenant: null, loading: true, refresh: async () => {} })

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!
const VENDORS_COL = process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL!
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!

export default function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = React.useState<Tenant | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const me = await account.get()

      // find profile for this user
      const profs = await databases.listDocuments(DB_ID, USERPROFILES_COL, [Query.equal("user_id", me.$id), Query.limit(1)])
      if (profs.total === 0) { setTenant(null); return }
      const profile = profs.documents[0] as any

      // load vendor
      const vendor = await databases.getDocument(DB_ID, VENDORS_COL, profile.vendor_id)

      setTenant({
        userId: me.$id,
        vendorId: vendor.$id,
        vendorSlug: (vendor as any).slug,
        vendorName: (vendor as any).name,
        role: (profile as any).role as "admin" | "operator",
      })
    } catch {
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  return (
    <TenantCtx.Provider value={{ tenant, loading, refresh: load }}>
      {children}
    </TenantCtx.Provider>
  )
}

export function useTenant() {
  return React.useContext(TenantCtx)
}
