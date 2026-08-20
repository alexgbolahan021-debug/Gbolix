# Gbolix Wallet v1.0 TODO

- [x] Add workspace and membership ownership tables.
- [x] Add product, entitlement, non-expiring credit account, immutable credit ledger, credit authorization, and product payment/order tables.
- [ ] Apply the additive Wallet schema and seed the Gbolix Leads product plus the approved credit packs to the production Gbolix database after resolving the database TLS connection configuration.
- [x] Add a controlled no-shell Render pre-deploy migration command for the Wallet schema, without running database changes at normal API startup.
- [x] Implement workspace-aware product entitlement and wallet APIs.
- [x] Implement idempotent reserve, finalization, and release operations for one qualified, non-duplicate Gbolix Leads result per credit.
- [x] Implement a separate Paystack product-credit checkout and webhook finalization path.
- [x] Implement signed Gbolix Leads request authorization, status, and integration-event endpoints.
- [x] Replace dashboard product and wallet placeholders with entitlement-aware customer routes and navigation.
- [x] Build Gbolix Leads customer request, job-status, result, and export interface inside the Gbolix dashboard.
- [x] Add automated tests and run full type checks.
- [ ] Add backend integration tests for workspace isolation, ledger persistence/idempotency, reserve/finalize/release behavior, entitlement enforcement, and signed engine dispatch after the Wallet schema is available to a test database.
- [ ] Verify Wallet, product access, and top-up flows against the Gbolix backend after the schema is applied.
- [x] Commit and push the Wallet v1.0 implementation to the Gbolix repository.
