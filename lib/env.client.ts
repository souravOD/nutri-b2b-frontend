// lib/env.client.ts
function must(v: string | undefined, name: string) {
  if (!v || v.trim() === "") throw new Error(`Missing/invalid ${name}. Set it in Vercel → Project → Environment Variables.`);
  return v.trim();
}

export const PublicEnv = {
  BACKEND_URL: must(process.env.NEXT_PUBLIC_BACKEND_URL, "NEXT_PUBLIC_BACKEND_URL"),
  APPWRITE_ENDPOINT: must(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT, "NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  APPWRITE_PROJECT_ID: must(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID, "NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  APPWRITE_DB_ID: must(process.env.NEXT_PUBLIC_APPWRITE_DB_ID, "NEXT_PUBLIC_APPWRITE_DB_ID"),
  APPWRITE_VENDORS_COL: must(process.env.NEXT_PUBLIC_APPWRITE_VENDORS_COL, "NEXT_PUBLIC_APPWRITE_VENDORS_COL"),
  APPWRITE_USERPROFILES_COL: must(process.env.NEXT_PUBLIC_APPWRITE_USERPROFILES_COL, "NEXT_PUBLIC_APPWRITE_USERPROFILES_COL"),
} as const;
