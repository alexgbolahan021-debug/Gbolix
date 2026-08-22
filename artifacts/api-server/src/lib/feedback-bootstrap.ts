import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Feedback is a small additive table. Keep this guard idempotent so a deployment
 * can recover when the database push step was not run separately.
 */
export async function ensureFeedbackTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "feedback" (
      "id" serial PRIMARY KEY,
      "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "name" text,
      "email" text,
      "rating" integer NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
      "comment" text NOT NULL,
      "source" text NOT NULL DEFAULT 'public' CHECK ("source" IN ('workspace', 'public')),
      "page_url" text,
      "status" text NOT NULL DEFAULT 'new' CHECK ("status" IN ('new', 'reviewed', 'archived')),
      "reviewed_at" timestamptz,
      "reviewed_by_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" ("created_at" DESC);
    CREATE INDEX IF NOT EXISTS "feedback_user_id_idx" ON "feedback" ("user_id");
  `);
  logger.info("Feedback table is ready");
}
