import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, leadsIntegrationEventsTable, leadsRequestsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { canUseProduct } from "../lib/walletPolicy";
import { WalletError, ensureWorkspaceWallet, releaseCredits, reserveCredits } from "../lib/walletService";
import { dispatchGbolixLeadsRequest } from "../lib/leadsEngineClient";
import { statusAfterSuccessfulLeadDispatch, statusAfterUsageFinalized } from "../lib/leadsLifecycleState";

const router = Router();

function fail(res: Response, error: unknown) {
  if (error instanceof WalletError) return res.status(error.status).json({ error: error.code, message: error.message });
  console.error("Leads control-plane error", error);
  return res.status(500).json({ error: "LEADS_CONTROL_PLANE_ERROR", message: "Unable to process Gbolix Leads request" });
}

async function reconcileFinalizedRequests(workspaceId: string) {
  const finalized = await db
    .select({ id: leadsRequestsTable.id })
    .from(leadsRequestsTable)
    .innerJoin(leadsIntegrationEventsTable, eq(leadsIntegrationEventsTable.requestId, leadsRequestsTable.id))
    .where(and(eq(leadsRequestsTable.workspaceId, workspaceId), eq(leadsRequestsTable.status, "running"), eq(leadsIntegrationEventsTable.eventType, "lead_usage_finalized")));
  await Promise.all(finalized.map(request => db.update(leadsRequestsTable).set({ status: statusAfterUsageFinalized("running"), updatedAt: new Date() }).where(and(eq(leadsRequestsTable.id, request.id), eq(leadsRequestsTable.status, "running")))));
}

router.get("/", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureWorkspaceWallet(req.userId);
    await reconcileFinalizedRequests(context.workspace.id);
    const requests = await db.select().from(leadsRequestsTable).where(eq(leadsRequestsTable.workspaceId, context.workspace.id)).orderBy(desc(leadsRequestsTable.updatedAt)).limit(100);
    return res.json({ workspaceKey: context.workspace.workspaceKey, product: { key: context.product.productKey, entitlementStatus: context.entitlement.status }, requests: requests.map(request => ({ key: request.requestKey, status: request.status, requestedLeadCount: request.requestedLeadCount, processedLeads: request.processedLeads, qualifiedLeads: request.qualifiedLeads, duplicatesSuppressed: request.duplicateLeads, engineJobKey: request.engineJobKey, resultSetKey: request.resultSetKey, createdAt: request.createdAt.toISOString(), updatedAt: request.updatedAt.toISOString() })) });
  } catch (error) { return fail(res, error); }
});

router.post("/requests", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const desiredLeadCount = Number(req.body?.desiredLeadCount);
    const categoryCode = typeof req.body?.categoryCode === "string" ? req.body.categoryCode.trim() : "";
    const inputType = req.body?.inputType === "domain_list" ? "domain_list" : req.body?.inputType === "csv_upload" ? "csv_upload" : null;
    const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
    const rawContent = typeof req.body?.rawContent === "string" ? req.body.rawContent : "";
    const idempotencyKey = String(req.header("idempotency-key") ?? req.body?.idempotencyKey ?? "").trim();
    if (!idempotencyKey || idempotencyKey.length > 160) return res.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED", message: "Provide a unique Idempotency-Key for this Gbolix Leads request" });
    if (!Number.isInteger(desiredLeadCount) || desiredLeadCount < 1 || desiredLeadCount > 50000) return res.status(422).json({ error: "INVALID_LEAD_COUNT", message: "Gbolix Leads requests must contain between 1 and 50,000 leads" });
    if (!categoryCode) return res.status(422).json({ error: "CATEGORY_REQUIRED", message: "Select a lead category" });
    if (!inputType || !label || !rawContent) return res.status(422).json({ error: "USER_SOURCE_REQUIRED", message: "Provide a CSV or domain-list source, label, and content for this Leads request" });
    const context = await ensureWorkspaceWallet(req.userId);
    if (!canUseProduct(context.entitlement.status)) return res.status(403).json({ error: "PRODUCT_ENTITLEMENT_REQUIRED", message: "Activate Gbolix Leads or purchase a credit pack before starting a lead request" });
    const existing = await db.select().from(leadsRequestsTable).where(and(eq(leadsRequestsTable.workspaceId, context.workspace.id), eq(leadsRequestsTable.idempotencyKey, idempotencyKey))).limit(1);
    if (existing[0]) return res.status(200).json({ requestKey: existing[0].requestKey, status: existing[0].status, reused: true });
    const requestKey = `grq_${crypto.randomUUID().replace(/-/g, "")}`;
    const reservation = await reserveCredits({ userId: req.userId, requestKey, maximumCredits: desiredLeadCount });
    const requestSpec = { categoryCode, inputType, label, geography: req.body?.geography ?? {}, keywords: Array.isArray(req.body?.keywords) ? req.body.keywords : [], sourcePolicy: { allowUserProvidedSources: true, allowProviderDiscovery: false } };
    const [created] = await db.insert(leadsRequestsTable).values({ requestKey, workspaceId: context.workspace.id, productId: context.product.id, requestedByUserId: req.userId, creditAuthorizationId: reservation.authorization.id, idempotencyKey, requestSpec, requestedLeadCount: desiredLeadCount, status: "queued" }).returning();
    try {
      const dispatch = await dispatchGbolixLeadsRequest({ externalRequestId: requestKey, externalWorkspaceId: context.workspace.workspaceKey, externalCustomerId: String(req.userId), actorId: String(req.userId), creditAuthorizationId: reservation.authorization.authorizationKey, label, inputType, rawContent, categoryCode });
      await db.update(leadsRequestsTable).set({ engineJobKey: dispatch.jobId, status: statusAfterSuccessfulLeadDispatch("queued"), updatedAt: new Date() }).where(and(eq(leadsRequestsTable.id, created.id), eq(leadsRequestsTable.status, "queued")));
      return res.status(202).json({ requestKey: created.requestKey, workspaceKey: context.workspace.workspaceKey, status: "running", engineJobKey: dispatch.jobId, creditAuthorization: { key: reservation.authorization.authorizationKey, maximumCredits: reservation.authorization.maximumCredits, state: reservation.authorization.state }, reused: false });
    } catch (dispatchError) {
      await releaseCredits({ authorizationKey: reservation.authorization.authorizationKey, releaseKey: `${requestKey}:dispatch_failed`, reason: "leads_engine_dispatch_failed" });
      await db.update(leadsRequestsTable).set({ status: "failed", lastErrorCode: dispatchError instanceof WalletError ? dispatchError.code : "LEADS_ENGINE_DISPATCH_FAILED", updatedAt: new Date() }).where(eq(leadsRequestsTable.id, created.id));
      throw dispatchError;
    }
  } catch (error) { return fail(res, error); }
});

router.get("/requests/:requestKey", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureWorkspaceWallet(req.userId);
    const [request] = await db.select().from(leadsRequestsTable).where(and(eq(leadsRequestsTable.workspaceId, context.workspace.id), eq(leadsRequestsTable.requestKey, String(req.params.requestKey)))).limit(1);
    if (!request) return res.status(404).json({ error: "LEADS_REQUEST_NOT_FOUND" });
    return res.json({ requestKey: request.requestKey, status: request.status, requestedLeadCount: request.requestedLeadCount, processedLeads: request.processedLeads, qualifiedLeads: request.qualifiedLeads, duplicatesSuppressed: request.duplicateLeads, engineJobKey: request.engineJobKey, resultSetKey: request.resultSetKey, requestSpec: request.requestSpec, lastErrorCode: request.lastErrorCode, updatedAt: request.updatedAt.toISOString() });
  } catch (error) { return fail(res, error); }
});

export default router;
