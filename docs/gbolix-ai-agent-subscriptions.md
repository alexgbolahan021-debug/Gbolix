# Gbolix AI Agent subscriptions

The Gbolix AI Agent monetization model uses three capability levels. **Level 1 — AI Assistant** is free and remains available immediately. **Level 2 — AI Knowledge Agent** is displayed as **$15/month** and grants **5,000 universal Gbolix Credits per successful recurring billing period**. **Level 3 — AI Action Agent** is displayed as **$30/month** and grants **15,000 universal Gbolix Credits per successful recurring billing period**.

All usage continues to use the central Gbolix Wallet. One successful AI response consumes one credit, failed calls consume zero credits, and the wallet never goes negative. Subscription credits are ledger grants with an idempotency key tied to the subscription and billing period, so replayed Paystack events cannot grant the same monthly allowance twice.

## Paystack configuration

The recurring plans must be created or approved in the Paystack account as fixed monthly plans. The existing dynamic USD-to-NGN conversion used for one-off wallet packs must not be used for recurring subscriptions. Paystack plan amounts and currencies are fixed by the configured plan, while Gbolix continues to show the approved USD catalog prices in the customer experience.

Set the following variables on the **Gbolix API service on Render**. Do not place the Paystack secret or the encryption key in Vercel or in any browser-exposed variable.

| Variable | Required value |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Existing server-only Paystack secret. |
| `PAYSTACK_AI_AGENT_LEVEL2_PLAN_CODE` | The fixed monthly Paystack plan code for the $15-display Level 2 plan. |
| `PAYSTACK_AI_AGENT_LEVEL3_PLAN_CODE` | The fixed monthly Paystack plan code for the $30-display Level 3 plan. |
| `PAYSTACK_AI_AGENT_CURRENCY` | The currency used by both configured plans, normally `NGN` for the current Paystack checkout setup. |
| `PAYSTACK_AI_AGENT_SUBSCRIPTION_CALLBACK_URL` | `https://gbolix.site/payment/callback` |
| `PAYSTACK_SUBSCRIPTION_TOKEN_ENCRYPTION_KEY` | A long random server-only value used to encrypt Paystack email tokens at rest. |
| `GBOLIX_AI_AGENT_PLATFORM_TOKEN` | The existing shared internal token already used by the engine/platform wallet bridge. |

Keep the existing Paystack Dashboard webhook URL unchanged so wallet and project payments continue to work:

```text
https://api.gbolix.site/api/payments/paystack/webhook
```

The API now recognizes AI Agent subscription events on that same endpoint and dispatches them internally to the subscription handler; no second Paystack webhook URL is required. Enable the relevant recurring events in Paystack, including `charge.success`, `subscription.create`, `invoice.update`, `invoice.payment_failed`, `subscription.not_renew`, and `subscription.disable`. The server validates `x-paystack-signature` against the raw request body before processing any event, while preserving the existing legacy payment signature and settlement flow.

## Customer flow

A customer selecting Level 1 is taken directly to the normal agent creation form. A customer selecting Level 2 or Level 3 receives an authenticated checkout initialization response and is redirected to Paystack only when the server has verified that the configured plan code is available. The pending checkout is stored with the authenticated workspace and user before the redirect.

The browser return page calls the server-side verification endpoint. The callback is not the payment source of truth: successful webhook processing and server-to-server Paystack verification activate the product entitlement and grant the first monthly credit allowance. The engine separately calls the trusted platform entitlement check before allowing a paid-level agent to be created or upgraded.

## Safe go-live sequence

First create or confirm the two fixed monthly Paystack plans and copy their plan codes. Then add the Render variables above, leave the existing Paystack Dashboard webhook unchanged, redeploy the API, and verify that the customer plan picker reports the paid plans as configured. Only after that should an owner perform a controlled Paystack test transaction using an approved payment method. No plan creation or payment charge is performed by the code automatically.

The customer can later upgrade the same agent through the engine upgrade endpoint. Higher-level upgrades preserve the agent ID, instructions, knowledge, conversations, deployments, and configuration snapshots. A future downgrade can therefore lock capabilities without deleting those records; the entitlement layer remains the source of truth for whether paid capabilities are currently usable.
