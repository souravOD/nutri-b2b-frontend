// lib/appwriteServer.ts
// Server-side Appwrite client (Node SDK). Do NOT import this in the browser.

import { Client, Databases, Teams, Users, Query } from "node-appwrite"

// Read envs with sensible fallbacks (adjust to your .env names)
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT

const project =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
  process.env.APPWRITE_PROJECT

// Server key – never expose as NEXT_PUBLIC
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !project || !apiKey) {
  throw new Error(
    "Missing Appwrite env. Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, (PROJECT_ID or PROJECT), APPWRITE_API_KEY"
  )
}

// Node SDK client (server only)
export const serverClient = new Client()
  .setEndpoint(endpoint)
  .setProject(project)
  .setKey(apiKey)

export const sdb = new Databases(serverClient)
export const steams = new Teams(serverClient)
export const susers = new Users(serverClient)

// Re-export Query so API routes can: import { Query } from "@/lib/appwriteServer"
export { Query }
