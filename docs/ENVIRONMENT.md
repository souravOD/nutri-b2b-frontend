# Environment Variables

This app reads its configuration from environment variables. For local dev, copy `.env.example` → `.env.local` and fill the values. In production (Vercel), define them in Project Settings → Environment Variables.

## Variables

- `NEXT_PUBLIC_BACKEND_URL`: Base URL of the B2B backend (no trailing slash). Dev fallback: `http://localhost:5000`.
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Appwrite endpoint (region-specific).
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Appwrite project id.
- `NEXT_PUBLIC_APPWRITE_DB_ID`: Database id for onboarding/profile guards.
- `NEXT_PUBLIC_APPWRITE_VENDORS_COL`: Collection name for vendors.
- `NEXT_PUBLIC_APPWRITE_USERPROFILES_COL`: Collection name for user profiles.
- `NEXT_PUBLIC_BASE_URL`: Optional site URL for server-only fallbacks.
- `APPWRITE_API_KEY`: **Server-only** Appwrite key for API routes under `app/api/*` (if used).

## Notes

- Never commit real secrets. If you do, rotate immediately and purge from git history.
- On Vercel, do not prefix server-only secrets with `NEXT_PUBLIC_`.
