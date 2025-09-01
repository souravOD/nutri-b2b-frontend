# Troubleshooting

## 1) CORS errors (blocked by CORS policy)
- Symptom: Browser console shows CORS errors when calling the backend.
- Fix: Add the frontend’s Vercel domain and custom domain (if any) to the backend CORS allow-list.

## 2) Login/auth not working
- Check Appwrite endpoint and project id.
- Ensure the domain is allowed in Appwrite console (OAuth/cookie settings if applicable).

## 3) Deployed build differs from local
- Vercel uses its own Node version. Use `.nvmrc` locally and set `engines.node` in `package.json`.
- If you enabled strict TS/ESLint in CI, fix violations locally.

## 4) API calls point to localhost in production
- Ensure `NEXT_PUBLIC_BACKEND_URL` is set on Vercel. Dev fallback (`http://localhost:5000`) is only for local env.

## 5) Images not loading with next/image
- Add remote hosts to `next.config.*` `images.remotePatterns`.
