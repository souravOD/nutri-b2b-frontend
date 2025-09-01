# Deploying to Vercel (Step-by-step)

1. **Fork or push** this repo to GitHub.
2. In **Vercel**, click **New Project** → **Import Git Repository** → select this repo.
3. Choose the **frontend** branch.
4. Framework should auto-detect as **Next.js**. No custom config needed.
5. Set **Environment Variables** (Project → Settings → Environment Variables):

   - `NEXT_PUBLIC_BACKEND_URL` — e.g., `https://api.yourdomain.com`
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT` — e.g., `https://nyc.cloud.appwrite.io/v1`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID` — your Appwrite project ID
   - `NEXT_PUBLIC_APPWRITE_DB_ID` — your Appwrite DB ID
   - `NEXT_PUBLIC_APPWRITE_VENDORS_COL` — `vendors`
   - `NEXT_PUBLIC_APPWRITE_USERPROFILES_COL` — `user_profiles`
   - `APPWRITE_API_KEY` — **Server key** (for server routes if used)

6. Ensure your **backend CORS allow-list** includes `<your-vercel-domain>` and your custom domain (if any).
7. Click **Deploy**. The app will be available at the Vercel-provided URL. Add your custom domain if desired.

## After Deploy

- Test login and basic navigation.
- Confirm API calls hit your backend domain and pass CORS.
- Rotate any secrets that were accidentally committed and remove them from git history.
