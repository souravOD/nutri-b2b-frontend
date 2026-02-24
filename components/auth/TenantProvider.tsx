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

async function resolveVendorFromProfile(profile: any) {
  const vendorId = String(profile?.vendor_id ?? "").trim()
  const vendorSlug = String(profile?.vendor_slug ?? "").trim().toLowerCase()

  if (vendorId) {
    try {
      return await databases.getDocument(DB_ID, VENDORS_COL, vendorId)
    } catch {
      // Fall through to slug lookup for legacy profiles.
    }
  }

  const slugCandidate = vendorSlug || vendorId.toLowerCase()
  if (!slugCandidate) return null

  try {
    const bySlug = await databases.listDocuments(DB_ID, VENDORS_COL, [
      Query.equal("slug", slugCandidate),
      Query.limit(1),
    ])
    if (bySlug.total > 0) return bySlug.documents[0] as any
  } catch {
    // Ignore and return null below.
  }

  return null
}

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

      // Resolve vendor from profile, supporting both doc-id and slug legacy values.
      const vendor = await resolveVendorFromProfile(profile)
      if (!vendor) { setTenant(null); return }

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
