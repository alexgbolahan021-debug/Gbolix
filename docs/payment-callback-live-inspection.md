# Live Payment Callback Inspection

## 2026-08-20

The production route `https://www.gbolix.site/payment/callback` loaded for an authenticated browser session. Its rendered content displayed the protected workspace layout and the expected message **“No Paystack payment reference was found.”**

This confirms that the page itself is currently reachable behind the existing Clerk configuration in this browser session. It does not confirm the behavior of a fresh Paystack redirect, and it does not establish that `VITE_CLERK_PROXY_URL` is set in Vercel. The next investigation must examine the production bundle and real redirect behavior rather than change Vercel settings based on the earlier DNS report alone.

The Vercel production deployment for commit `6495eb1` became ready and was assigned the `www.gbolix.site` alias. A subsequent visit to `/payment/callback` reached the updated application and displayed the normal Gbolix loading state while Clerk initialized. No Vercel environment setting was changed.

After initialization, the authenticated callback route rendered normally. The bundle currently served at `https://www.gbolix.site/assets/index-Bf8MdISx.js` contains both `/api/payments/paystack/verify/` and `/api/wallet/payments/paystack/verify/`, and does not contain `clerk.api.gbolix.site`. This is evidence that the Wallet routing release is live and that the currently served build has no configured invalid Clerk proxy hostname.
