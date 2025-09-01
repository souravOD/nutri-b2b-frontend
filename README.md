# Nutri B2B — Frontend (Next.js + Appwrite + Supabase)

A production-ready frontend for the Nutri B2B platform. Built with Next.js (App Router), Tailwind, and shadcn/ui. Auth is via **Appwrite**; data is served by the **B2B Backend** (Express) and **Supabase (Postgres)** behind it.

> **Note:** The `app/api/*` routes in this repo are **mock/proxy** helpers only; the production app calls the real backend using `NEXT_PUBLIC_BACKEND_URL`.

---

## Contents
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deploying to Vercel](#deploying-to-vercel)
- [Post-deploy Checklist](#post-deploy-checklist)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Security](#security)

## Architecture

- **Next.js App Router** (SSR/ISR where applicable)
- **Tailwind CSS** + shadcn/ui components
- **Appwrite** for authentication (browser SDK on the client; optional server key for API routes)
- **Supabase** (Postgres) — accessed by the **backend**; the frontend never talks directly to the DB
- **Backend (B2B)** — REST API, runs separately (default dev URL: `http://localhost:5000`)

Key pages:
- `/dashboard`, `/products`, `/customers`, `/jobs`, `/search`

## Prerequisites
- **Node.js >= 18.18.0** (use `.nvmrc` with `nvm use`)
- **npm** (or `pnpm`/`yarn` if you prefer; commands here use npm)
- Access to:
  - Appwrite (Project ID, Endpoint, and **Server API key** for server-side routes)
  - B2B Backend URL (e.g., `https://api.yourdomain.com`)

## Environment Variables

Copy `.env.example` → `.env.local`, then fill these values (also set them in Vercel → Project Settings → Environment Variables):

| Name | Required | Example | Notes |
|------|----------|---------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | ✅ | `https://api.yourdomain.com` | Base URL of the **B2B Backend** (no trailing slash). |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ | `https://nyc.cloud.appwrite.io/v1` | Appwrite HTTP endpoint (region-specific). |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ✅ | `YOUR_PROJECT_ID` | Appwrite project ID. |
| `NEXT_PUBLIC_APPWRITE_DB_ID` | ✅ | `YOUR_DB_ID` | Used by onboarding/profile guards (browser-safe). |
| `NEXT_PUBLIC_APPWRITE_VENDORS_COL` | ✅ | `vendors` | Collection name. |
| `NEXT_PUBLIC_APPWRITE_USERPROFILES_COL` | ✅ | `user_profiles` | Collection name. |
| `NEXT_PUBLIC_BASE_URL` | ⬜ | `https://your-frontend.vercel.app` | Optional; used in a few server-only fallbacks. |
| `APPWRITE_API_KEY` | ✅ (server only) | `sk_xxx...` | **Server key** for API routes under `app/api/*` if you enable them. Do **not** prefix with `NEXT_PUBLIC_`. |

> **Dev fallback:** When `NEXT_PUBLIC_BACKEND_URL` isn’t set, code falls back to `http://localhost:5000` for local development.

## Local Development

```bash
# 1) Install
npm ci

# 2) Env
cp .env.example .env.local
# Fill values for your Appwrite + backend

# 3) Run dev
npm run dev
# App at http://localhost:3000
```

## Deploying to Vercel

1. **Push this repo to GitHub** (see commands below).
2. **Create a Vercel Project** → Import this GitHub repo.
3. **Branch**: Select `frontend` (or your chosen deploy branch).
4. **Framework Preset**: **Next.js** (auto-detected). No custom build/output needed.
5. **Set Environment Variables** (Project Settings → Environment Variables):

   - `NEXT_PUBLIC_BACKEND_URL` — e.g., `https://api.yourdomain.com`
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT` — e.g., `https://nyc.cloud.appwrite.io/v1`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID` — your Appwrite project ID
   - `NEXT_PUBLIC_APPWRITE_DB_ID` — your Appwrite DB ID
   - `NEXT_PUBLIC_APPWRITE_VENDORS_COL` — `vendors`
   - `NEXT_PUBLIC_APPWRITE_USERPROFILES_COL` — `user_profiles`
   - `APPWRITE_API_KEY` — **Server key** (never expose as NEXT_PUBLIC)

6. **CORS (Backend)**: Add your Vercel domain(s) to the backend CORS allow-list.
7. **Deploy**: Click **Deploy**. Vercel will run `npm install` + `next build` automatically.

## Post-deploy Checklist

- Login flow (Appwrite) is working (`/login` → redirect → dashboard).
- Dashboard + Products + Customers + Jobs + Search render without client or server errors.
- Network calls (Products/Customers/Jobs/Search) hit your `NEXT_PUBLIC_BACKEND_URL` domain.
- If using `next/image` with external images, ensure `next.config.*` allows the host(s).

## Troubleshooting

Common issues and fixes live in [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md). Highlights:
- **CORS** issues from the backend → add the Vercel domain to the backend CORS allow-list.
- **Auth** not persisting → verify Appwrite endpoint/project id and cookie settings.
- **Build** fails on strict TS/ESLint → by default, we don’t fail the build for type/lint. For stricter PRs, enable checks and fix violations.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branching, commit message style, and PR guidelines.

## Security

See [`SECURITY.md`](./SECURITY.md). **Do not** commit real secrets. If you accidentally did, rotate the keys and remove them from git history.

---

### Git commands to push this frontend into your GitHub repo

We’ll push to your existing repo and **frontend** branch:  
`https://github.com/sourav1859/nutri-b2b` (branch: `frontend`)

```bash
# From your local frontend project root (where package.json exists)

# 0) (One-time) Ensure no secrets are tracked
git rm --cached .env.local 2>/dev/null || true

# 1) Initialize if needed
git init

# 2) Commit everything
git add -A
git commit -m "feat(frontend): initial commit — Nutri B2B frontend (Next.js)"

# 3) Add the GitHub remote
git remote add origin https://github.com/sourav1859/nutri-b2b.git

# 4) Create/switch to 'frontend' branch
git checkout -b frontend

# 5) Push to GitHub
git push -u origin frontend

# (Optional) Open a PR from 'frontend' → your manager's target branch (e.g., 'main' or 'backend')
# You can do this in the GitHub UI or with gh CLI:
# gh pr create --base backend --head frontend --title "Nutri B2B Frontend" --body "Next.js app for Nutri B2B..."
```
