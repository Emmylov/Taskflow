# TaskFlow

TaskFlow is an agency operations storefront and workspace for coordinating client projects, creative production, deliverables, and admin operations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server through its managed workflow (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

TaskFlow source lives in the storefront and API artifacts. The database schema is under `lib/db/src/schema/`, with API contracts in `lib/api-spec/openapi.yaml` and generated client types in the `lib` workspace packages.

## Architecture decisions

- Production role access remains tied to authenticated accounts, invitations, and server-side authorization.
- `/demo` uses clearly labeled sample data and local-only interactions; it never impersonates an account or calls protected APIs.
- Vercel hosting is an optional path. The app still needs a replacement for Replit's object-storage sidecar before uploads can work there.

## Product

Clients can request coordinated creative services, track project conversations and deliverables, and manage brand context. Creators handle assigned production work. Admins manage the project inbox, team, tasks, and revenue. Public visitors can preview the three account experiences without signing in at `/demo`.

## User preferences

- The product is intended to be sold as an agency template; prospective buyers should be able to preview client, creator, and admin experiences.
- Keep future GitHub/Vercel hosting practical, and avoid changes that unnecessarily increase deployment or maintenance complexity.

## Gotchas

- Run `pnpm run typecheck` for a full workspace check.
- Replit's API routes are served under `/api`; the local storefront proxy is only for Replit development.
- Vercel needs its own OIDC provider and durable file-storage adapter; see `docs/VERCEL.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
