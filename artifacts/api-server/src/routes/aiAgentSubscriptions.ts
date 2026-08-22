import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  aiAgentSubscriptionPlansTable,
  aiAgentSubscriptionsTable,
  db,
  usersTable,
  workspacesTable,
} from "@workspace/db";
import { requireAdmin, requireAuth } from "../middlewares/requireAuth";
import {
  WalletError,
  checkAIAgentEntitlement,
  createAIAgentSubscriptionCheckout,
  ensureAIAgentSubscriptionPlans,
  ensureAIAgentWorkspaceWallet,
  linkAIAgentSubscriptionProvider,
  recordAIAgentSubscriptionEvent,
  settleAIAgentSubscriptionPayment,
  updateAIAgentSubscriptionState,
} from "../lib/walletService";
import { GBOLIX_AI_AGENT_PRODUCT_KEY, aiAgentSubscriptionPlanDefinitions } from "../lib/walletPolicy";

const router = Router();
const PAYSTACK_API = "https://api.paystack.co";
type RawBodyRequest = Request & { rawBody?: Buffer };

type PaystackResponse = {
  status?: boolean;
  message?: string;
  data?: any;
};

function paystackSecret() {
  const key = process.env.PAYSTACK_AI_AGENT_SECRET_KEY?.trim() || process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new WalletError("PAYMENT_CONFIGURATION_ERROR", "Subscription checkout is not configured", 503);
  return key;
}

function aiAgentCallbackUrl() {
  const value = process.env.PAYSTACK_AI_AGENT_SUBSCRIPTION_CALLBACK_URL?.trim()
    || process.env.PAYSTACK_CALLBACK_URL?.trim()
    || process.env.PAYSTACK_WALLET_CALLBACK_URL?.trim();
  if (!value) throw new WalletError("PAYSTACK_CALLBACK_NOT_CONFIGURED", "A Paystack callback URL is not configured", 503);
  return value;
}

function subscriptionReference() {
  return `GBX-AI-SUB-${crypto.randomUUID()}`;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function webhookSignatureIsValid(req: RawBodyRequest) {
  const signature = req.header("x-paystack-signature");
  if (!signature || !req.rawBody) return false;
  const expected = crypto.createHmac("sha512", paystackSecret()).update(req.rawBody).digest("hex");
  const actualBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function parseDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function extractPlanCode(data: any) {
  if (typeof data?.plan === "string") return data.plan;
  return data?.plan?.plan_code ?? data?.plan?.code ?? data?.subscription?.plan?.plan_code;
}

function extractSubscriptionCode(data: any) {
  return data?.subscription_code ?? data?.subscription?.subscription_code ?? data?.subscription?.code;
}

function extractCustomerCode(data: any) {
  return data?.customer?.customer_code ?? data?.customer_code;
}

function extractEmailToken(data: any) {
  return data?.email_token ?? data?.subscription?.email_token;
}

function encryptEmailToken(token: unknown) {
  if (typeof token !== "string" || !token) return undefined;
  const configuredKey = process.env.PAYSTACK_SUBSCRIPTION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configuredKey) return undefined;
  const key = crypto.createHash("sha256").update(configuredKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptEmailToken(value: string) {
  const configuredKey = process.env.PAYSTACK_SUBSCRIPTION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configuredKey) return undefined;
  try {
    const [ivPart, tagPart, ciphertextPart] = value.split(".");
    if (!ivPart || !tagPart || !ciphertextPart) return undefined;
    const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.createHash("sha256").update(configuredKey).digest(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
  } catch { return undefined; }
}

function getPaymentAmountSubunit(data: any) {
  const amount = Number(data?.amount);
  return Number.isInteger(amount) && amount >= 0 ? amount : undefined;
}

function subscriptionError(res: Response, error: unknown) {
  if (error instanceof WalletError) return res.status(error.status).json({ error: error.code, message: error.message });
  console.error("AI Agent subscription route error", error);
  return res.status(500).json({ error: "AI_AGENT_SUBSCRIPTION_FAILED", message: "Unable to process the AI Agent subscription request" });
}

async function fetchPaystackPlan(planCode: string) {
  const response = await fetch(`${PAYSTACK_API}/plan/${encodeURIComponent(planCode)}`, { headers: { Authorization: `Bearer ${paystackSecret()}` } });
  const data = await response.json() as PaystackResponse;
  if (!response.ok || !data.status || data.data?.amount == null || !data.data?.currency) {
    console.warn("Paystack AI Agent plan lookup failed", {
      planCode,
      httpStatus: response.status,
      paystackStatus: data.status ?? null,
      paystackMessage: data.message ?? null,
      hasPlanPayload: Boolean(data.data),
      returnedCurrency: data.data?.currency ?? null,
    });
    throw new WalletError("PAYSTACK_PLAN_UNAVAILABLE", "The configured Paystack recurring plan could not be verified", 503);
  }
  return { amountSubunit: Number(data.data.amount), currency: String(data.data.currency) };
}

async function verifyWithPaystack(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecret()}` },
  });
  const data = await response.json() as PaystackResponse;
  return { response, data };
}

async function settleVerifiedPaystackPayment(reference: string, data: any, billingPeriodKey?: string) {
  const [pending] = await db.select({ subscription: aiAgentSubscriptionsTable, plan: aiAgentSubscriptionPlansTable })
    .from(aiAgentSubscriptionsTable)
    .innerJoin(aiAgentSubscriptionPlansTable, eq(aiAgentSubscriptionsTable.planId, aiAgentSubscriptionPlansTable.id))
    .where(eq(aiAgentSubscriptionsTable.paymentReference, reference))
    .limit(1);
  if (!pending) throw new WalletError("SUBSCRIPTION_NOT_FOUND", "AI Agent subscription checkout was not found", 404);
  const receivedPlanCode = extractPlanCode(data);
  if (receivedPlanCode && receivedPlanCode !== pending.plan.paystackPlanCode) throw new WalletError("SUBSCRIPTION_PLAN_MISMATCH", "The Paystack transaction was not for the selected AI Agent plan", 409);
  const receivedCurrency = typeof data?.currency === "string" ? data.currency : undefined;
  const result = await settleAIAgentSubscriptionPayment({
    paymentReference: reference,
    paystackCustomerCode: extractCustomerCode(data),
    paystackSubscriptionCode: extractSubscriptionCode(data),
    encryptedEmailToken: encryptEmailToken(extractEmailToken(data)),
    amountSubunit: getPaymentAmountSubunit(data),
    currency: receivedCurrency,
    billingPeriodKey: billingPeriodKey ?? reference,
    currentPeriodStart: parseDate(data?.paid_at) ?? parseDate(data?.transaction_date),
    nextPaymentAt: parseDate(data?.next_payment_date),
  });
  return result;
}

async function findSubscriptionByProviderData(data: any) {
  const subscriptionCode = extractSubscriptionCode(data);
  if (subscriptionCode) {
    const [row] = await db.select().from(aiAgentSubscriptionsTable).where(eq(aiAgentSubscriptionsTable.paystackSubscriptionCode, String(subscriptionCode))).limit(1);
    if (row) return row;
  }
  const reference = data?.reference;
  if (typeof reference === "string") {
    const [row] = await db.select().from(aiAgentSubscriptionsTable).where(eq(aiAgentSubscriptionsTable.paymentReference, reference)).limit(1);
    if (row) return row;
  }
  const customerCode = extractCustomerCode(data);
  if (customerCode) {
    const [row] = await db.select().from(aiAgentSubscriptionsTable).where(eq(aiAgentSubscriptionsTable.paystackCustomerCode, String(customerCode))).orderBy(desc(aiAgentSubscriptionsTable.createdAt)).limit(1);
    if (row) return row;
  }
  const email = data?.customer?.email ?? data?.email;
  if (typeof email === "string" && email) {
    const [row] = await db.select({ subscription: aiAgentSubscriptionsTable }).from(aiAgentSubscriptionsTable).innerJoin(usersTable, eq(aiAgentSubscriptionsTable.purchasedByUserId, usersTable.id)).where(eq(usersTable.email, email)).orderBy(desc(aiAgentSubscriptionsTable.createdAt)).limit(1);
    if (row?.subscription) return row.subscription;
  }
  return undefined;
}

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 200) || 200, 1), 500);
    const rows = await db.select({ subscription: aiAgentSubscriptionsTable, plan: aiAgentSubscriptionPlansTable, user: usersTable, workspace: workspacesTable })
      .from(aiAgentSubscriptionsTable)
      .innerJoin(aiAgentSubscriptionPlansTable, eq(aiAgentSubscriptionsTable.planId, aiAgentSubscriptionPlansTable.id))
      .innerJoin(usersTable, eq(aiAgentSubscriptionsTable.purchasedByUserId, usersTable.id))
      .innerJoin(workspacesTable, eq(aiAgentSubscriptionsTable.workspaceId, workspacesTable.id))
      .orderBy(desc(aiAgentSubscriptionsTable.createdAt)).limit(limit);
    return res.json(rows.map(({ subscription, plan, user, workspace }) => ({ id: subscription.id, workspaceKey: workspace.workspaceKey, customerName: user.name, customerEmail: user.email, planKey: subscription.planKey, level: subscription.level, planName: plan.planKey, monthlyCredits: plan.monthlyCredits, state: subscription.state, paymentReference: subscription.paymentReference, paystackSubscriptionCode: subscription.paystackSubscriptionCode, currentPeriodEnd: subscription.currentPeriodEnd, nextPaymentAt: subscription.nextPaymentAt, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, createdAt: subscription.createdAt })));
  } catch (error) { return subscriptionError(res, error); }
});

router.get("/current", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureAIAgentWorkspaceWallet(`gws_user_${req.userId}`);
    const plans = await ensureAIAgentSubscriptionPlans();
    const [subscription] = await db.select().from(aiAgentSubscriptionsTable).where(eq(aiAgentSubscriptionsTable.workspaceId, context.workspace.id)).orderBy(desc(aiAgentSubscriptionsTable.createdAt)).limit(1);
    const capabilities = (context.entitlement.capabilities ?? {}) as Record<string, unknown>;
    return res.json({
      plans: aiAgentSubscriptionPlanDefinitions.map(definition => {
        const configured = plans.find(plan => plan.planKey === definition.planKey);
        return { planKey: definition.planKey, level: definition.level, displayName: definition.displayName, displayPriceUsd: Number(definition.displayPriceUsd), monthlyCredits: definition.monthlyCredits, configured: Boolean(configured) };
      }),
      entitlement: { status: context.entitlement.status, planKey: context.entitlement.planKey, level: Number(capabilities.agentLevel ?? 1), capabilities: context.entitlement.capabilities, startsAt: context.entitlement.startsAt, endsAt: context.entitlement.endsAt },
      subscription: subscription ? { planKey: subscription.planKey, level: subscription.level, state: subscription.state, currentPeriodEnd: subscription.currentPeriodEnd, nextPaymentAt: subscription.nextPaymentAt, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : null,
    });
  } catch (error) { return subscriptionError(res, error); }
});

router.post("/checkout/:planKey/initialize", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const planKey = String(req.params.planKey);
    const definition = aiAgentSubscriptionPlanDefinitions.find(item => item.planKey === planKey);
    if (!definition) return res.status(404).json({ error: "SUBSCRIPTION_PLAN_NOT_FOUND", message: "The selected AI Agent plan does not exist" });
    const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!user?.email) return res.status(422).json({ error: "BILLING_EMAIL_REQUIRED", message: "A verified account email is required for checkout" });
    const reference = subscriptionReference();
    const targetAgentId = typeof req.body?.agentId === "string" && req.body.agentId.length <= 120 ? req.body.agentId : undefined;
    const created = await createAIAgentSubscriptionCheckout({ userId: req.userId, planKey, paymentReference: reference, metadata: targetAgentId ? { targetAgentId } : undefined });
    const fixedPlan = await fetchPaystackPlan(created.plan.paystackPlanCode);
    await db.update(aiAgentSubscriptionPlansTable).set({ paystackAmountSubunit: fixedPlan.amountSubunit, currency: fixedPlan.currency, updatedAt: new Date() }).where(eq(aiAgentSubscriptionPlansTable.id, created.plan.id));
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackSecret()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        plan: created.plan.paystackPlanCode,
        reference,
        callback_url: aiAgentCallbackUrl(),
        metadata: { subscriptionKey: created.subscription.subscriptionKey, planKey, level: definition.level, workspaceKey: created.context.workspace.workspaceKey, productKey: GBOLIX_AI_AGENT_PRODUCT_KEY, ...(targetAgentId ? { targetAgentId } : {}) },
      }),
    });
    const data = await response.json() as PaystackResponse;
    if (!response.ok || !data.status || !data.data?.authorization_url) {
      await db.update(aiAgentSubscriptionsTable).set({ state: "failed", updatedAt: new Date() }).where(eq(aiAgentSubscriptionsTable.id, created.subscription.id));
      return res.status(502).json({ error: "PAYSTACK_INITIALIZATION_FAILED", message: data.message || "Paystack did not return a checkout URL" });
    }
    return res.status(201).json({ authorizationUrl: data.data.authorization_url, reference, planKey, level: definition.level, displayPriceUsd: Number(definition.displayPriceUsd), monthlyCredits: definition.monthlyCredits });
  } catch (error) { return subscriptionError(res, error); }
});

router.post("/cancel", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureAIAgentWorkspaceWallet(`gws_user_${req.userId}`);
    const [subscription] = await db.select().from(aiAgentSubscriptionsTable).where(and(eq(aiAgentSubscriptionsTable.workspaceId, context.workspace.id), eq(aiAgentSubscriptionsTable.state, "active"))).orderBy(desc(aiAgentSubscriptionsTable.createdAt)).limit(1);
    if (!subscription?.paystackSubscriptionCode || !subscription.paystackEmailTokenEncrypted) return res.status(409).json({ error: "SUBSCRIPTION_MANAGEMENT_UNAVAILABLE", message: "This subscription cannot be cancelled from Gbolix yet. Please contact support." });
    const emailToken = decryptEmailToken(subscription.paystackEmailTokenEncrypted);
    if (!emailToken) return res.status(503).json({ error: "SUBSCRIPTION_TOKEN_UNAVAILABLE", message: "Subscription management is temporarily unavailable." });
    const response = await fetch(`${PAYSTACK_API}/subscription/disable`, { method: "POST", headers: { Authorization: `Bearer ${paystackSecret()}`, "Content-Type": "application/json" }, body: JSON.stringify({ code: subscription.paystackSubscriptionCode, token: emailToken }) });
    const data = await response.json() as PaystackResponse;
    if (!response.ok || !data.status) return res.status(502).json({ error: "PAYSTACK_CANCELLATION_FAILED", message: data.message || "Paystack could not cancel the subscription" });
    const updated = await updateAIAgentSubscriptionState({ subscriptionCode: subscription.paystackSubscriptionCode, state: "non_renewing" });
    return res.json({ cancelled: true, state: updated?.state, currentPeriodEnd: updated?.currentPeriodEnd });
  } catch (error) { return subscriptionError(res, error); }
});

router.post("/payments/paystack/verify/:reference", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const reference = String(req.params.reference);
    const [owned] = await db.select({ subscription: aiAgentSubscriptionsTable, workspaceId: aiAgentSubscriptionsTable.workspaceId })
      .from(aiAgentSubscriptionsTable)
      .innerJoin(usersTable, eq(aiAgentSubscriptionsTable.purchasedByUserId, usersTable.id))
      .where(and(eq(aiAgentSubscriptionsTable.paymentReference, reference), eq(aiAgentSubscriptionsTable.purchasedByUserId, req.userId)))
      .limit(1);
    if (!owned) return res.status(404).json({ error: "SUBSCRIPTION_NOT_FOUND" });
    const verified = await verifyWithPaystack(reference);
    if (!verified.response.ok || !verified.data.status || verified.data.data?.status !== "success") return res.json({ paid: false, status: verified.data.data?.status ?? "unknown", message: verified.data.message ?? "Payment is not complete yet" });
    const result = await settleVerifiedPaystackPayment(reference, verified.data.data, reference);
    return res.json({ paid: true, planKey: result.subscription?.planKey, level: result.subscription?.level, monthlyCredits: result.plan.monthlyCredits, granted: result.granted, entitlement: result.entitlement });
  } catch (error) { return subscriptionError(res, error); }
});

export async function handleAIAgentPaystackWebhook(req: RawBodyRequest): Promise<boolean> {
  if (!webhookSignatureIsValid(req)) return false;
  const event = req.body as any;
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(event));
  const digest = crypto.createHash("sha256").update(raw).digest("hex");
  const deliveryId = req.header("x-paystack-event-id")?.trim() || digest;
  const providerReference = typeof event?.data?.reference === "string" ? event.data.reference : extractSubscriptionCode(event?.data);
  const type = String(event?.event ?? "");
  const data = event?.data ?? {};
  if (type === "charge.success" || (type === "invoice.update" && (data.status === "success" || data.paid === true))) {
    const reference = typeof data.reference === "string" ? data.reference : undefined;
    const existing = await findSubscriptionByProviderData(data);
    if (reference && reference.startsWith("GBX-AI-SUB-")) await settleVerifiedPaystackPayment(reference, data, reference);
    else if (existing) await settleAIAgentSubscriptionPayment({ paymentReference: existing.paymentReference, paystackCustomerCode: extractCustomerCode(data), paystackSubscriptionCode: extractSubscriptionCode(data), encryptedEmailToken: encryptEmailToken(extractEmailToken(data)), amountSubunit: getPaymentAmountSubunit(data), currency: typeof data.currency === "string" ? data.currency : undefined, billingPeriodKey: data.paid_at || data.transaction_date || reference || deliveryId, currentPeriodStart: parseDate(data.paid_at) ?? parseDate(data.transaction_date), nextPaymentAt: parseDate(data.next_payment_date) });
  } else if (type === "subscription.create") {
    const existing = await findSubscriptionByProviderData(data);
    if (existing) await linkAIAgentSubscriptionProvider({ subscriptionId: existing.id, paystackCustomerCode: extractCustomerCode(data), paystackSubscriptionCode: extractSubscriptionCode(data), encryptedEmailToken: encryptEmailToken(extractEmailToken(data)), amountSubunit: getPaymentAmountSubunit(data), currency: typeof data.currency === "string" ? data.currency : undefined, nextPaymentAt: parseDate(data.next_payment_date) });
  } else if (type === "invoice.payment_failed") {
    const existing = await findSubscriptionByProviderData(data);
    if (existing) await updateAIAgentSubscriptionState({ subscriptionCode: existing.paystackSubscriptionCode ?? undefined, paymentReference: existing.paystackSubscriptionCode ? undefined : existing.paymentReference, state: "past_due" });
  } else if (type === "subscription.not_renew") {
    const existing = await findSubscriptionByProviderData(data);
    if (existing) await updateAIAgentSubscriptionState({ subscriptionCode: existing.paystackSubscriptionCode ?? undefined, paymentReference: existing.paystackSubscriptionCode ? undefined : existing.paymentReference, state: "non_renewing", currentPeriodEnd: parseDate(data.next_payment_date) });
  } else if (type === "subscription.disable") {
    const existing = await findSubscriptionByProviderData(data);
    if (existing) await updateAIAgentSubscriptionState({ subscriptionCode: existing.paystackSubscriptionCode ?? undefined, paymentReference: existing.paystackSubscriptionCode ? undefined : existing.paymentReference, state: "cancelled", currentPeriodEnd: parseDate(data.next_payment_date) });
  }
  await recordAIAgentSubscriptionEvent({ deliveryId, eventType: type || "unknown", providerReference, payload: event ?? {}, payloadDigest: digest });
  return true;
}

router.post("/payments/paystack/webhook", async (req: RawBodyRequest, res) => {
  try {
    if (!(await handleAIAgentPaystackWebhook(req))) return res.sendStatus(401);
    return res.sendStatus(200);
  } catch (error) {
    console.error("AI Agent subscription webhook error", error);
    return res.sendStatus(500);
  }
});

async function resolveWorkspaceKey(rawWorkspaceKey: string) {
  const [direct] = await db.select({ workspaceKey: workspacesTable.workspaceKey }).from(workspacesTable).where(eq(workspacesTable.workspaceKey, rawWorkspaceKey)).limit(1);
  if (direct) return direct.workspaceKey;
  const candidates = [rawWorkspaceKey, rawWorkspaceKey.replace(/^workspace[_:]/, "")];
  for (const candidate of candidates) {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, candidate)).limit(1);
    if (user) return `gws_user_${user.id}`;
  }
  throw new WalletError("WORKSPACE_NOT_FOUND", "The Gbolix workspace could not be resolved", 404);
}

router.post("/entitlement-check", async (req, res) => {
  const expected = process.env.GBOLIX_AI_AGENT_PLATFORM_TOKEN;
  const supplied = req.header("authorization")?.replace(/^Bearer\s+/i, "") || req.header("x-gbolix-platform-token");
  if (!expected || !supplied || !safeEqual(expected, supplied)) return res.status(401).json({ error: "INTERNAL_AUTH_REQUIRED" });
  try {
    const rawWorkspaceKey = String(req.body?.workspaceKey ?? req.body?.workspaceId ?? "");
    const requestedLevel = Number(req.body?.requestedLevel ?? 1);
    if (!rawWorkspaceKey || !Number.isInteger(requestedLevel) || requestedLevel < 1 || requestedLevel > 3) return res.status(400).json({ error: "INVALID_ENTITLEMENT_CHECK" });
    const workspaceKey = await resolveWorkspaceKey(rawWorkspaceKey);
    return res.json(await checkAIAgentEntitlement(workspaceKey, requestedLevel));
  } catch (error) { return subscriptionError(res, error); }
});

export default router;
