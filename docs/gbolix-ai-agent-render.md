# Gbolix AI Agent on Render

The product runs as two separate Render services:

| Service | Repository | Render type | Role |
| --- | --- | --- | --- |
| `gbolix-site` | `alexgbolahan021-debug/Gbolix` | Static site | Customer/admin UI, Clerk session, existing Gbolix platform UI |
| `gbolix-ai-agent-engine` | `alexgbolahan021-debug/Gbolix-AI-Agent-Product` | Node web service | Agent runtime, knowledge, conversations, tools, deployments, usage |

## Site variables

Set these on the `gbolix-site` service:

| Variable | Value |
| --- | --- |
| `VITE_GBOLIX_AGENT_URL` | The public URL of the engine, for example `https://gbolix-ai-agent-engine.onrender.com` |
| `VITE_API_URL` | The existing Gbolix API URL, if the site API is hosted separately |
| `VITE_CLERK_PUBLISHABLE_KEY` | Existing Clerk publishable key |
| `VITE_CLERK_PROXY_URL` | Existing Clerk proxy URL, if used |

The browser calls management routes with the current Clerk bearer token. It must never receive `GBOLIX_PLATFORM_TOKEN`, the engine provider key, or a database URL. The recommended engine setup uses `CLERK_SECRET_KEY`, which avoids the manual JWKS mismatch. If `CLERK_SECRET_KEY` is absent, the engine falls back to `CLERK_JWKS_URL`.

## Engine variables

Set these on the `gbolix-ai-agent-engine` service:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Render Postgres connection string |
| `AI_PROVIDER` | Set to `gemini` for the free-tier Gemini setup |
| `GEMINI_API_KEY` | API key created in [Google AI Studio](https://aistudio.google.com/api-keys) |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` |
| `DEFAULT_MODEL` | `gemini-2.5-flash-lite` for the initial free-tier setup |
| `OPENAI_API_KEY` | Optional; only needed when `AI_PROVIDER=openai` |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible base URL |

| `CREDIT_MODE` | Use `platform` in production and `local` only for smoke tests |
| `GBOLIX_PLATFORM_URL` | Existing Gbolix API base URL that owns credit authorization and usage events |
| `GBOLIX_PLATFORM_TOKEN` | Private service-to-service credential |
| `CLERK_SECRET_KEY` | The existing Clerk secret key from the same Clerk environment as the working Vercel publishable key. Keep it secret. |
| `CLERK_JWKS_URL` | Optional fallback only; it is not required when `CLERK_SECRET_KEY` is configured. |
| `AGENT_ADMIN_USER_IDS` | Comma-separated owner/admin subjects allowed to view global AI Agent data |
| `CORS_ORIGINS` | Comma-separated allowed site/customer origins |
| `PUBLIC_BASE_URL` | Public engine URL used in generated embed snippets |

## Deployment order

Deploy the engine first, create its Postgres database, set `PUBLIC_BASE_URL`, and confirm `GET /healthz` returns `status: ok`. Then deploy the site with `VITE_GBOLIX_AGENT_URL` pointing at the engine. Sign in as a customer and verify `/dashboard/products/gbolix-ai-agent`; sign in as an owner/admin and verify `/admin/ai-agent`.

## Production credit integration

The current engine has a real reservation/finalization client, but the authoritative endpoints remain owned by the Gbolix platform. Google AI Studio provides a free tier with limited model access and project-level rate limits; the free tier is suitable for initial testing, not guaranteed unlimited production traffic. Check Google’s [pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) before launch. The site API should implement:

```text
POST /api/internal/credit-authorizations
POST /api/internal/credit-authorizations/{authorizationKey}/release
POST /api/internal/usage-events
```

Those routes should authenticate `GBOLIX_PLATFORM_TOKEN`, identify the workspace and AI Agent product, create a credit authorization against the existing ledger, finalize only successful responses, and enforce idempotency on `requestId`/`sourceKey`. The engine must not be granted database access to the site’s wallet tables.

## Current validation

The engine passes TypeScript compilation and a local provider-backed smoke test covering health, agent creation, message execution, one-credit usage recording, and usage summary. The site Vite production build succeeds with `PORT=5173 BASE_PATH=/`. The repository’s standalone strict typecheck still reports pre-existing generated-client build/type errors outside the new AI Agent files; those errors should be addressed in the existing API-client build pipeline before treating the entire monorepo as clean.
