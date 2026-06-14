/**
 * Seed script: promote alexgbolahan021@gmail.com to admin role.
 * Run this AFTER the account has been created via sign-up.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed-admin
 */

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ADMIN_EMAIL = "alexgbolahan021@gmail.com";

const result = await pool.query<{ email: string; role: string }>(
  `UPDATE users SET role = 'admin' WHERE email = $1 RETURNING email, role`,
  [ADMIN_EMAIL],
);

if (result.rows.length === 0) {
  console.log(`⚠️  No user found with email "${ADMIN_EMAIL}".`);
  console.log("    Sign up at /sign-up first, then re-run this seed.");
} else {
  console.log(`✅  ${result.rows[0].email} → role: ${result.rows[0].role}`);
}

await pool.end();
