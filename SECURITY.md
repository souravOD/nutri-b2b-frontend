# Security Guidelines

- **Never** commit real secrets (`.env*`). Use `.env.example` for placeholders.
- If a secret was committed:
  1. Rotate the secret in the provider (Appwrite, etc.).
  2. Remove it from git history (rewrite or GitHub tools).
  3. Force-push the cleaned branch if needed.
- Grant least-privilege to API keys (scopes).
- Review CORS policy on the backend for your Vercel domains.
