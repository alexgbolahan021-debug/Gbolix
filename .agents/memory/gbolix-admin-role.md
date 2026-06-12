---
name: Gbolix Admin Role Setup
description: How to grant admin access; no UI exists, must use SQL directly.
---

Admin role is stored in the `users` table (`role` column, default `'client'`).

**Why:** No admin promotion UI was built intentionally — only the platform owner (Alex) should be admin. UI promotion would be a security risk.

**How to apply:** To make a user admin, run this SQL via the Replit DB tool or psql:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

The `requireAdmin` middleware in `artifacts/api-server/src/middlewares/requireAuth.ts` checks `req.userRole === 'admin'` which is set after JIT-provisioning the user from Clerk session.
