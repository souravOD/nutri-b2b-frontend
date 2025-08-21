# my-v0-project

B2B Nutrition Application (Frontend) built with Next.js and Appwrite Authentication.

## Tech Stack
- Next.js 14 (App Router) + React + TypeScript
- Tailwind CSS & shadcn/ui
- Appwrite SDK for Auth and Database
- Icons: lucide-react

## Project Structure (top-level)
```
total 273
drwxr-xr-x 2 sandbox sandbox    440 Aug 21 15:41 .
drwxr-xr-x 2 sandbox sandbox    140 Aug 21 15:41 ..
-rw-r--r-- 1 sandbox sandbox    599 Aug 21 15:41 .env.local
-rw-r--r-- 1 sandbox sandbox    313 Aug 21 15:41 .gitignore
drwxr-xr-x 2 sandbox sandbox    420 Aug 21 15:41 app
drwxr-xr-x 2 sandbox sandbox    520 Aug 21 15:41 components
-rw-r--r-- 1 sandbox sandbox    447 Aug 21 15:41 components.json
drwxr-xr-x 2 sandbox sandbox    100 Aug 21 15:41 hooks
drwxr-xr-x 2 sandbox sandbox    100 Aug 21 15:41 lib
-rw-r--r-- 1 sandbox sandbox    233 Aug 21 15:41 next-env.d.ts
-rw-r--r-- 1 sandbox sandbox    241 Aug 21 15:41 next.config.mjs
-rw-r--r-- 1 sandbox sandbox 244520 Aug 21 15:41 package-lock.json
-rw-r--r-- 1 sandbox sandbox   2375 Aug 21 15:41 package.json
-rw-r--r-- 1 sandbox sandbox   4856 Aug 21 15:41 patch_appwrite_schema.sh
-rw-r--r-- 1 sandbox sandbox    151 Aug 21 15:41 postcss.config.mjs
-rw-r--r-- 1 sandbox sandbox   5633 Aug 21 15:41 provision_appwrite_collections.sh
drwxr-xr-x 2 sandbox sandbox    240 Aug 21 15:41 public
-rw-r--r-- 1 sandbox sandbox   8235 Aug 21 15:41 seed-vendors.ps1
-rw-r--r-- 1 sandbox sandbox   5905 Aug 21 15:41 seed-vendors.sh
drwxr-xr-x 2 sandbox sandbox     60 Aug 21 15:41 styles
-rw-r--r-- 1 sandbox sandbox    595 Aug 21 15:41 tsconfig.json
-rw-r--r-- 1 sandbox sandbox   1118 Aug 21 15:41 vendors.json
```

### App routes
- `app/` — Next.js App Router pages
- `components/` — reusable UI components
- `lib/` — helpers (Appwrite client, utils)
- `styles/` — global styles

## Scripts
- `build`: next build
- `dev`: next dev
- `lint`: next lint
- `start`: next start

## Prerequisites
- Node.js 18+ (recommend 20 LTS)
- npm or yarn or pnpm
- Appwrite project (Project ID, Endpoint)
- Database with collections for:
  - Vendors
  - User Profiles
  - (Optional) Teams
- CORS configured for http://localhost:3000 and your deployment domain

## Environment Variables
Create `.env.local` in the project root. Example:
```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
# Database / collections used in OnboardingGate
NEXT_PUBLIC_APPWRITE_DB_ID=
NEXT_PUBLIC_APPWRITE_VENDORS_COL=
NEXT_PUBLIC_APPWRITE_USERPROFILES_COL=
APPWRITE_API_KEY=
```

- `NEXT_PUBLIC_*` keys are safe to expose to the browser (no secrets).
- Non-`NEXT_PUBLIC_*` keys must remain server-only.

## Local Development
```bash
npm install
npm run dev
```
Visit http://localhost:3000

## Production
```bash
npm run build
npm start
```

## Appwrite Setup (Minimum)
1. Create Project → get **Project ID** and **Endpoint**.
2. Create Database: note **Database ID**.
3. Create Collections:
   - `user_profiles` (store app user data)
   - `vendors` (store vendor info)
4. Set rules/RLS appropriately.
5. Create API Key (server-side) if needed for any backend scripts.
6. Add CORS for localhost and your prod domains.

## Contributing
- Use feature branches and open PRs against `frontend` branch.
- Run `npm run build` and fix lint warnings before PR.

## License
TBD (add a LICENSE file, e.g., MIT).

---
Generated based on the scanned project.
