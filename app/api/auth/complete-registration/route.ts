import { NextResponse } from "next/server"
import { Permission, Role } from "node-appwrite"
import { sdb, Query } from "@/lib/appwriteServer"

const DB_ID            = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!
const VENDORS_COL      = process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL!
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!

// Use server-only envs for REST fallback
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT! // e.g. https://nyc.cloud.appwrite.io/v1
const APPWRITE_PROJECT  = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT!
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY!              // server key (never NEXT_PUBLIC)
const BASE_URL          = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"

/** Try to add user to team directly by userId via REST (instant membership).
 *  Falls back to email invite if direct add is not supported.
 *  Both paths are safe to call multiple times.
 */
async function ensureTeamMember(teamId: string, userId: string, email: string) {
  // 1) Direct add (server) – POST /teams/{teamId}/memberships { userId, roles }
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/teams/${teamId}/memberships`, {
      method: "POST",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT,
        "X-Appwrite-Key": APPWRITE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        roles: ["viewer"],
      }),
    })

    if (res.ok) return

    // If already a member (409) → fine
    if (res.status === 409) return

    // Otherwise throw to trigger email invite fallback
    const msg = await res.text()
    throw new Error(`Direct add failed: ${res.status} ${msg}`)
  } catch {
    // 2) Email invite fallback (requires email + url)
    try {
      const res2 = await fetch(`${APPWRITE_ENDPOINT}/teams/${teamId}/memberships`, {
        method: "POST",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT,
          "X-Appwrite-Key": APPWRITE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          roles: ["viewer"],
          url: `${BASE_URL}/login?joined=1`,
        }),
      })
      // 200/201 = invite created. 409 = already invited/member. Either way, continue.
      if (res2.ok || res2.status === 409) return
    } catch {
      /* ignore; membership may already exist or plan limitations */
    }
  }
}

export async function POST(req: Request) {
  try {
    const { userId, email, fullName } = await req.json()
    if (!userId || !email) {
      return NextResponse.json({ ok: false, message: "userId & email required" }, { status: 400 })
    }

    const domain = String(email).split("@")[1]?.toLowerCase()
    if (!domain) {
      return NextResponse.json({ ok: false, message: "Bad email" }, { status: 400 })
    }

    // 1) Find vendor by domain
    const matches = await sdb.listDocuments(DB_ID, VENDORS_COL, [
      Query.contains("domains", [domain]),
      Query.limit(2),
    ])
    if (matches.total !== 1) {
      return NextResponse.json(
        { ok: false, reason: "no_vendor", message: `No unique vendor for domain "${domain}".` },
        { status: 404 },
      )
    }

    const vendor   = matches.documents[0] as any
    const vendorId = vendor.$id as string
    const teamId   = vendor.team_id as string
    if (!teamId) {
      return NextResponse.json(
        { ok: false, reason: "vendor_missing_team_id", message: "Vendor missing team_id." },
        { status: 500 },
      )
    }

    // 2) Ensure team membership now
    await ensureTeamMember(teamId, userId, email)

    // 3) Idempotent user_profile upsert (docId = userId prevents duplicates)
    const docId  = userId
    const nowIso = new Date().toISOString()
    const profileData = {
      user_id: userId,
      vendor_id: vendorId,
      full_name: fullName || email.split("@")[0],
      role: "viewer",
      created_at: nowIso,
    }

    try {
      await sdb.createDocument(
        DB_ID,
        USERPROFILES_COL,
        docId,
        profileData,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.read(Role.team(teamId)),
          Permission.update(Role.team(teamId)),
        ],
      )
    } catch {
      // If already exists, update minimal fields (don't overwrite created_at)
      await sdb.updateDocument(DB_ID, USERPROFILES_COL, docId, {
        vendor_id: vendorId,
        full_name: profileData.full_name,
        role: profileData.role,
      })
    }

    return NextResponse.json({ ok: true, vendorId, teamId })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "server error" }, { status: 500 })
  }
}
