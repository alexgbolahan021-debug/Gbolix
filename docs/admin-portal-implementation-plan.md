# Admin Portal implementation plan

## Reused sources of truth

- `users` remains the source for users, client counts, onboarding dimensions, and customer growth.
- `projects` remains the source for requests, lifecycle statuses, project prices, active/completed values, and project history.
- `payments` remains the source for project payment status and amounts; a paid payment is counted once by payment row and never inferred from project price.
- `product_orders`, `credit_accounts`, and `credit_ledger_entries` remain the source for wallet purchases, balances, and credit usage/adjustments.
- `offers`, `agreements`, `messages`, `notifications`, and `activity` remain the existing offer, chat, status-notification, and lightweight audit flow.

## Shared metric definitions

- Total users: count of all user rows.
- Total clients: users whose normalized role is `client`.
- Total requests and project counts: count of project rows, filtered by the canonical project status.
- Active projects: `queued`, `in_progress`, and `review`.
- Completed projects: `completed`.
- Paid/pending/declined payment value: sum of distinct payment rows grouped by `paid`, `pending`, and `failed`/`cancelled`; amounts are grouped by currency rather than converted with fabricated rates.
- Total revenue: paid project payments only; wallet purchases are reported separately.
- Wallet purchase metrics: successful `product_orders` only, with customer count derived from distinct purchasers and credit totals derived from paid orders.
- Current outstanding credits: sum of `available_credits + reserved_credits` across canonical credit accounts.
- Used credits: negative `finalize` ledger entries, reported as a positive usage count.

## Known data limitations

- The current project-payment schema has no refund or partial-payment model; refund and partial-payment metrics will be shown as unavailable rather than invented.
- The current activity schema stores descriptive audit records but has no structured previous/new-value or actor-reason columns. New manual credit adjustments will use the wallet ledger metadata and an activity record; project status changes continue to use the existing activity record.
- Historical trend charts use records present in the database. No synthetic data will be generated.
- Financial values are returned grouped by currency. The project payment flow settles in NGN while agreement prices are authored in USD; the analytics UI will label currencies rather than silently convert them.

## Delivery sequence

1. Add one admin analytics endpoint with a time-range query and shared metric response.
2. Make Dashboard and Insights consume that endpoint.
3. Add an owner/admin Credits page backed by the existing wallet tables and an audited adjustment endpoint.
4. Add status confirmation and financial summaries to Projects while preserving the separate payment status.
5. Wire Admin Chat Create Offer to the existing offer endpoint and invalidate the conversation/project queries.
6. Validate permissions, builds, tests, and responsive rendering.
