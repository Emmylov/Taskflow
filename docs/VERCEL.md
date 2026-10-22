# Deploying TaskFlow on Vercel

The repository includes a Vercel build configuration for the TaskFlow storefront and an Express function entry point for the API. The storefront build no longer requires Replit's `PORT` or `BASE_PATH` variables.

## Before deploying

1. Import the GitHub repository into Vercel and keep the repository root as the project root.
2. Use pnpm and Node.js 24. The checked-in `vercel.json` supplies the install command, frontend build command, output directory, and SPA fallback.
3. Provision a hosted PostgreSQL database and set `DATABASE_URL`.
4. Configure an OpenID Connect provider and set `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, and `APP_ORIGIN`. Register `https://<your-domain>/api/callback` as its callback URL. `SESSION_SECRET` must also be set. On Replit, the existing `REPL_ID` fallback and Replit issuer remain available.
5. Configure the provider's logout settings if it supports OIDC logout.

## Known service-specific work

- **File uploads and private media need a storage adapter before Vercel use.** The current object-storage signer calls Replit's local sidecar at `127.0.0.1:1106`; that service does not exist in Vercel Functions. Replace that signer with a durable provider before relying on brand-vault, profile-image, or project-file uploads.
- **Whop subscriptions are optional for the storefront to load.** Hosted checkout requires `WHOP_API_KEY`, `WHOP_COMPANY_ID`, and the configured plan IDs (`WHOP_PLAN_STARTER`, `WHOP_PLAN_GROWTH`, and `WHOP_PLAN_SCALE`).
- Configure any owner email, notification, and platform-encryption settings your deployment uses. Keep all credentials in Vercel environment variables, not in source control.
- The sample role demo at `/demo` is static, local-only data and does not require these services.

This is a deployment starting point, not a claim that Replit-managed storage or identity can be reused unchanged on Vercel.
