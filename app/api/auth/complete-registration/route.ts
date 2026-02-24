import { NextResponse } from "next/server"
import { Permission, Role } from "node-appwrite"
import { sdb, steams, susers, Query } from "@/lib/appwriteServer"

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID!
const VENDORS_COL = process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL!
const USERPROFILES_COL = process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL!
const INVITATIONS_COL = process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COL || ""

// Use server-only envs for REST fallback
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT! // e.g. https://nyc.cloud.appwrite.io/v1
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT!
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!              // server key (never NEXT_PUBLIC)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"

/** Try to add user to team directly by userId via REST (instant membership).
 *  Falls back to email invite if direct add is not supported.
 *  Both paths are safe to call multiple times.
 *  When userRole is "vendor_admin", assigns the Appwrite "owner" role so the user
 *  can send team invitations from the client SDK.
 */
async function ensureTeamMember(teamId: string, userId: string, email: string, userRole = "viewer") {
  // Map platform role → Appwrite team role
  // "owner" is required for client-side teams.createMembership()
  const appwriteTeamRoles =
    userRole === "vendor_admin" ? ["owner"] : ["viewer"]

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
        roles: appwriteTeamRoles,
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
          roles: appwriteTeamRoles,
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

    // ── Server-side verify: confirm userId exists in Appwrite ──
    let verifiedUser
    try {
      verifiedUser = await susers.get(userId)
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid userId — user not found in auth provider" },
        { status: 401 }
      )
    }
    if (verifiedUser.email.toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json(
        { ok: false, message: "Email does not match authenticated user" },
        { status: 403 }
      )
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

    const vendor = matches.documents[0] as any
    const vendorSlug = String(vendor.slug || vendor.$id || "").toLowerCase()
    const teamId = vendor.team_id as string
    if (!teamId) {
      return NextResponse.json(
        { ok: false, reason: "vendor_missing_team_id", message: "Vendor missing team_id." },
        { status: 500 },
      )
    }

    // 2) Check for invitation to determine role (do this BEFORE ensureTeamMember)
    //    Check both "pending" and "accepted" because the set-password handler
    //    marks the invitation as "accepted" before the user logs in and hits
    //    this endpoint via auth-guard.
    let assignedRole = "viewer"
    let matchedInvitationId: string | null = null

    if (INVITATIONS_COL) {
      try {
        // First try pending, then fall back to recently accepted
        for (const status of ["pending", "accepted"]) {
          const invitations = await sdb.listDocuments(DB_ID, INVITATIONS_COL, [
            Query.equal("email", String(email).toLowerCase()),
            Query.equal("status", status),
            Query.limit(1),
          ])

          if (invitations.total > 0) {
            const inv = invitations.documents[0] as any
            const expiresAt = inv.expires_at ? new Date(inv.expires_at) : null
            if (!expiresAt || expiresAt > new Date()) {
              assignedRole = inv.role || "viewer"
              matchedInvitationId = status === "pending" ? inv.$id : null // only mark pending→accepted
              break
            }
          }
        }
      } catch (invErr: any) {
        // Non-fatal: if invitations collection doesn't exist yet, just default to viewer
        console.warn("[complete-registration] invitation check skipped:", invErr?.message)
      }
    }

    // 2b) Fallback: if no invitation matched, check existing Appwrite team membership
    //     for the correct role (handles admin/organic users who were never invited)
    if (assignedRole === "viewer") {
      try {
        const memberships = await steams.listMemberships(teamId, [
          Query.equal("userId", userId),
          Query.limit(1),
        ])
        const m = memberships.memberships?.[0] as any
        if (m) {
          const roles: string[] = Array.isArray(m.roles) ? m.roles : []
          if (roles.includes("owner")) {
            assignedRole = "vendor_admin"
          } else if (roles.includes("admin")) {
            assignedRole = "vendor_admin"
          }
          // else keep "viewer"
        }
      } catch {
        // Non-fatal: membership check is best-effort
      }
    }

    // 3) Ensure team membership — pass the assignedRole so vendor_admin
    //    users get "owner" role (required for client-side invitation emails)
    await ensureTeamMember(teamId, userId, email, assignedRole)

    // 4) Idempotent user_profile upsert (supports both docId=userId and legacy doc ids)
    const docId = userId
    const nowIso = new Date().toISOString()
    const writeData = {
      vendor_id: vendorSlug,
      vendor_slug: vendorSlug,
      team_id: teamId,
      full_name: fullName || email.split("@")[0],
      role: assignedRole,
    }
    const permissions = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.read(Role.team(teamId)),
      Permission.update(Role.team(teamId)),
    ]

    let existingDocId: string | null = null
    try {
      const existing = await sdb.getDocument(DB_ID, USERPROFILES_COL, docId)
      existingDocId = existing.$id
    } catch {
      const byUserId = await sdb.listDocuments(DB_ID, USERPROFILES_COL, [
        Query.equal("user_id", userId),
        Query.limit(1),
      ])
      if (byUserId.total > 0) {
        existingDocId = byUserId.documents[0].$id
      }
    }

    if (existingDocId) {
      await sdb.updateDocument(DB_ID, USERPROFILES_COL, existingDocId, writeData)
    } else {
      await sdb.createDocument(
        DB_ID,
        USERPROFILES_COL,
        docId,
        {
          user_id: userId,
          created_at: nowIso,
          ...writeData,
        },
        permissions,
      )
    }

    // 5) Mark invitation as accepted (if one was matched)
    if (matchedInvitationId && INVITATIONS_COL) {
      try {
        await sdb.updateDocument(DB_ID, INVITATIONS_COL, matchedInvitationId, {
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
      } catch (invErr: any) {
        console.warn("[complete-registration] invitation accept failed:", invErr?.message)
      }
    }

    return NextResponse.json({ ok: true, vendorId: vendorSlug, teamId, role: assignedRole })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "server error" }, { status: 500 })
  }
}
