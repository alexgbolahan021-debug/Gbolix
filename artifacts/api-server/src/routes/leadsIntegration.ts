import crypto from "node:crypto";
import { Router, type Request as ExpressRequest, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { creditAuthorizationsTable, db, leadsIntegrationEventsTable, leadsRequestsTable } from "@workspace/db";
import { calculateChargeableLeadCredits } from "../lib/walletPolicy";
import { finalizeCredits, releaseCredits, WalletError } from "../lib/walletService";

const router = Router();

type RawBodyRequest = ExpressRequest & { rawBody?: Buffer };

function fail(res: Response, status: number, error: string, message: string) {
  return res.status(status).json({ error, message });
}

function verifySignature(req: RawBodyRequest) {
  const secret = process.env.GBOLIX_LEADS_CALLBACK_SECRET;
  const signature = req.header("x-gbolix-signature");
  const timestamp = req.header("x-gbolix-timestamp");
  if (!secret) throw new WalletError("LEADS_CALLBACK_NOT_CONFIGURED", "Gbolix Leads callback secret is not configured", 503);
  if (!signature || !timestamp || !req.rawBody) return false;
  const issuedAt = Date.parse(timestamp);
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${req.rawBody.toString("utf8")}`).digest("hex");
  const a = Buffer.from(signature, "utf8"); const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post("/events", async (req: RawBodyRequest, res) => {
  try {
    if (!verifySignature(req)) return fail(res, 401, "LEADS_CALLBACK_AUTH_FAILED", "Invalid or expired Gbolix Leads callback signature");
    const deliveryId = String(req.body?.deliveryId ?? "");
    const eventType = String(req.body?.eventType ?? "");
    const requestKey = String(req.body?.requestKey ?? "");
    if (!deliveryId || !eventType || !requestKey) return fail(res, 400, "INVALID_LEADS_EVENT", "deliveryId, eventType, and requestKey are required");
    const [request] = await db.select().from(leadsRequestsTable).where(eq(leadsRequestsTable.requestKey, requestKey)).limit(1);
    if (!request) return fail(res, 404, "LEADS_REQUEST_NOT_FOUND", "The referenced Gbolix Leads request does not exist");
    const payloadDigest = crypto.createHash("sha256").update(req.rawBody ?? Buffer.from("{}")).digest("hex");
    const [event] = await db.insert(leadsIntegrationEventsTable).values({ deliveryId, requestId: request.id, eventType, payload: req.body, payloadDigest, processedAt: new Date() }).onConflictDoNothing({ target: leadsIntegrationEventsTable.deliveryId }).returning();
    if (!event) return res.status(200).json({ accepted: true, duplicate: true });
    const progress = req.body?.progress ?? {};
    const basicUpdate = { engineJobKey: typeof req.body?.leadJobId === "string" ? req.body.leadJobId : request.engineJobKey, processedLeads: Number.isInteger(progress.processedLeads) ? progress.processedLeads : request.processedLeads, qualifiedLeads: Number.isInteger(progress.qualifiedLeads) ? progress.qualifiedLeads : request.qualifiedLeads, duplicateLeads: Number.isInteger(progress.duplicatesSuppressed) ? progress.duplicatesSuppressed : request.duplicateLeads, updatedAt: new Date() };
    if (eventType === "lead_job_progressed" || eventType === "lead_job_created") await db.update(leadsRequestsTable).set({ ...basicUpdate, status: eventType === "lead_job_created" ? "queued" : "running" }).where(eq(leadsRequestsTable.id, request.id));
    if (eventType === "lead_results_ready" || eventType === "lead_job_partially_complete") await db.update(leadsRequestsTable).set({ ...basicUpdate, status: eventType === "lead_job_partially_complete" ? "partially_complete" : "results_ready", resultSetKey: typeof req.body?.resultSetId === "string" ? req.body.resultSetId : request.resultSetKey }).where(eq(leadsRequestsTable.id, request.id));
    if (eventType === "lead_usage_finalized") {
      const usage = req.body?.usage ?? {};
      const qualifiedLeads = Number(usage.newQualifiedLeads ?? 0);
      const duplicatesSuppressed = Number(usage.duplicatesSuppressed ?? 0);
      const credits = calculateChargeableLeadCredits({ newQualifiedLeads: qualifiedLeads, duplicatesSuppressed });
      const [authorization] = await db.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.id, request.creditAuthorizationId)).limit(1);
      if (!authorization) return fail(res, 409, "CREDIT_AUTHORIZATION_NOT_FOUND", "Leads request has no valid credit authorization");
      const finalized = await finalizeCredits({ authorizationKey: authorization.authorizationKey, finalizedCredits: credits, usageEventKey: deliveryId, metadata: { requestKey, qualifiedLeads, duplicatesSuppressed, resultSetId: req.body?.resultSetId ?? null } });
      await db.update(leadsRequestsTable).set({ ...basicUpdate, status: "completed", qualifiedLeads, duplicateLeads: duplicatesSuppressed, resultSetKey: typeof req.body?.resultSetId === "string" ? req.body.resultSetId : request.resultSetKey, updatedAt: new Date() }).where(eq(leadsRequestsTable.id, request.id));
      return res.status(200).json({ accepted: true, finalizedCredits: finalized.authorization.finalizedCredits, releasedCredits: finalized.authorization.releasedCredits });
    }
    if (eventType === "lead_job_failed" || eventType === "lead_job_cancelled") {
      const [authorization] = await db.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.id, request.creditAuthorizationId)).limit(1);
      if (authorization?.state === "reserved") await releaseCredits({ authorizationKey: authorization.authorizationKey, releaseKey: deliveryId, reason: eventType });
      await db.update(leadsRequestsTable).set({ ...basicUpdate, status: eventType === "lead_job_cancelled" ? "cancelled" : "failed", lastErrorCode: typeof req.body?.error?.code === "string" ? req.body.error.code : eventType, updatedAt: new Date() }).where(eq(leadsRequestsTable.id, request.id));
    }
    return res.status(202).json({ accepted: true });
  } catch (error) {
    if (error instanceof WalletError) return fail(res, error.status, error.code, error.message);
    console.error("Leads integration event error", error);
    return fail(res, 500, "LEADS_EVENT_PROCESSING_ERROR", "Unable to process Gbolix Leads integration event");
  }
});

export default router;
