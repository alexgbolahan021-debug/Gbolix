# Gbolix

A premium B2B operations automation SaaS platform by Alex Gbolahan — clients submit service requests, track progress, and communicate with the admin through a polished client portal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + wouter + Clerk + TanStack Query + Tailwind v4 + shadcn/ui
- API: Express 5 + @clerk/express middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (users, projects, files, messages, activity)
- `lib/api-client-react/src/generated/api.ts` — generated hooks and types (do not edit)
- `artifacts/gbolix/src/App.tsx` — Clerk + router wiring, ProtectedRoute, OnboardingRoute
- `artifacts/gbolix/src/index.css` — Tailwind v4 theme vars (dark bg #0B0F14, primary #00FF66, secondary #A855F7)
- `artifacts/api-server/src/routes/` — all Express route handlers

## Architecture decisions

- Clerk auth via proxy path (`/api/__clerk`) so Clerk requests route through the shared reverse proxy cleanly
- File uploads use base64 JSON body (not multipart) — stored in `artifacts/api-server/uploads/`
- Onboarding is a required 4-step flow after sign-up (userType, location, companySize, acquisitionSource); `ProtectedRoute` enforces completion
- Admin role is stored in DB (`users.role = 'admin'`); set manually via SQL for the first admin
- Messages are scoped to projects; admin must "start a conversation" on a project before messages appear in client portal

## Product

**Public site:** Hero with animated cityscape, Services catalog, Products page (coming soon), Pricing page with per-service pricing.

**Client Portal:** Dashboard (summary cards + active tasks + recent activity), My Tasks (filterable table), Files (upload/download/delete), Messages (project-scoped chat), Profile (editable), New Request (3-step wizard: select service → details → confirmation).

**Admin Portal:** Dashboard (KPIs + recent requests), Users (searchable table), Projects (update status/priority/notes, start conversations), Messages (reply to all project chats), Files (view/delete all), Insights (charts: user type, acquisition source, location, company size breakdowns + AI summary).

## Gotchas

- CSS layer order in `index.css` MUST be: `@layer theme, base, clerk, components, utilities;` BEFORE `@import 'tailwindcss'`
- Vite config needs `tailwindcss({ optimize: false })` for Tailwind v4 to work
- Generated hook names follow Orval conventions (e.g. admin endpoints use `useAdminListProjects` not `useGetAdminProjects`)
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- To make a user admin: `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';` via DB

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
