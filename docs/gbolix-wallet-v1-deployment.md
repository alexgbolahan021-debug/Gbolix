# Gbolix Wallet v1.0 Deployment Prerequisites

Gbolix Wallet is implemented as the Gbolix control plane for workspace ownership, product entitlements, non-expiring credits, Paystack top-ups, and the Gbolix Leads request lifecycle. It is intentionally separate from the existing one-off service-project payment flow.

## Required schema application

The Wallet tables are defined in `lib/db/src/schema/wallet.ts` and exported from `lib/db/src/schema/index.ts`. Apply the additive schema from an environment that can connect to the Gbolix PostgreSQL database with its provider-required TLS configuration:

```bash
cd lib/db
pnpm exec drizzle-kit push --config ./drizzle.config.ts
```

If Render Shell is unavailable, use this controlled command in the **Gbolix API service’s Render Build Command** immediately before the existing API build command:

```bash
pnpm wallet:migrate && <existing-build-command>
```

Do not place `pnpm wallet:migrate` in the normal API start command. A migration is a deliberate deployment operation and must finish before the API process starts.

The implementation workspace could not establish an SSL connection to the configured database, so this schema push was **not applied** during development. Do not deploy or exercise the Wallet APIs until the schema has been applied and the workspace, ledger, and order tables have been verified.

## Required environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | Gbolix API | Initializes and verifies Wallet credit-pack payments; also verifies the dedicated Wallet Paystack webhook. |
| `PAYSTACK_WALLET_CALLBACK_URL` | Gbolix API | Customer return URL after a Wallet checkout. |
| `GBOLIX_LEADS_ENGINE_URL` | Gbolix API | Base URL for the deployed Leads engine signed intake endpoint. |
| `GBOLIX_LEADS_SHARED_SECRET` | Gbolix API and Leads engine | Shared HMAC secret for Gbolix-to-Leads request dispatch. It must equal the Leads engine's `GBOLIX_INTEGRATION_SECRET`. |
| `GBOLIX_LEADS_CALLBACK_SECRET` | Gbolix API | HMAC secret used to authenticate callbacks from Leads. It must equal the Leads engine's `GBOLIX_CONTROL_PLANE_CALLBACK_SECRET`. |
| `GBOLIX_CONTROL_PLANE_CALLBACK_URL` | Leads engine | The Gbolix endpoint for signed `lead_usage_finalized`, failure, and result callbacks. |
| `GBOLIX_CONTROL_PLANE_CALLBACK_SECRET` | Leads engine | HMAC secret for calls to the Gbolix callback endpoint. |

Use separate high-entropy secrets for the two directions. Store them in the respective deployment secret managers and rotate them with a previous-secret grace period before changing either side.

## Validation before launch

After the database TLS issue is resolved, apply the schema in a staging environment, complete a Paystack test checkout, confirm the ledger grants the pack credits exactly once, submit a signed user-source Leads request, and verify that the post-deduplication callback finalizes only `newQualifiedLeads` and releases the remaining reservation. Production rollout should follow the same checks, with all callback and webhook URLs configured over HTTPS.
