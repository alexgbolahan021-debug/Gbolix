import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { creditLedgerEntriesTable, creditPacksTable, db, productOrdersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { WalletError, ensureWorkspaceWallet, getWalletContext, settleCreditPurchase } from "../lib/walletService";

const router = Router();
const PAYSTACK_API = "https://api.paystack.co";
type RawBodyRequest = Request & { rawBody?: Buffer };

function paystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new WalletError("PAYMENT_CONFIGURATION_ERROR", "Wallet checkout is not configured", 503);
  return key;
}

function paymentReference(orderKey: string) {
  return `GBX-WALLET-${orderKey}-${crypto.randomUUID()}`;
}

function walletWebhookSignatureIsValid(req: RawBodyRequest): boolean {
  const signature = req.header("x-paystack-signature");
  if (!signature || !req.rawBody) return false;
  const expected = crypto.createHmac("sha512", paystackSecret()).update(req.rawBody).digest("hex");
  const actualBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function walletError(res: Response, error: unknown) {
  if (error instanceof WalletError) return res.status(error.status).json({ error: error.code, message: error.message });
  console.error("Wallet route error", error);
  return res.status(500).json({ error: "WALLET_INTERNAL_ERROR", message: "Unable to process wallet request" });
}

router.get("/", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY", message: "Complete account setup before using the wallet" });
    const context = await getWalletContext(req.userId);
    return res.json({
      workspace: { key: context.workspace.workspaceKey, name: context.workspace.displayName, membershipRole: context.membership.role },
      wallet: { availableCredits: context.account.availableCredits, reservedCredits: context.account.reservedCredits, totalCredits: context.account.availableCredits + context.account.reservedCredits, neverExpires: true },
      products: context.entitlements.map(({ product, entitlement }) => ({ key: product.productKey, displayName: product.displayName, productStatus: product.status, entitlementStatus: entitlement.status, planKey: entitlement.planKey, capabilities: entitlement.capabilities })),
      packs: context.packs.map(pack => ({ key: pack.packKey, name: pack.displayName, credits: pack.credits, price: Number(pack.price), currency: pack.currency, badge: pack.badge })),
    });
  } catch (error) { return walletError(res, error); }
});

router.get("/ledger", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureWorkspaceWallet(req.userId);
    const entries = await db.select().from(creditLedgerEntriesTable).where(eq(creditLedgerEntriesTable.accountId, context.account.id)).orderBy(desc(creditLedgerEntriesTable.createdAt)).limit(100);
    return res.json(entries.map(entry => ({ id: entry.id, type: entry.entryType, credits: entry.credits, sourceType: entry.sourceType, sourceKey: entry.sourceKey, metadata: entry.metadata, createdAt: entry.createdAt.toISOString() })));
  } catch (error) { return walletError(res, error); }
});

router.post("/checkout/:packKey/initialize", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const context = await ensureWorkspaceWallet(req.userId);
    const [pack] = await db.select().from(creditPacksTable).where(and(eq(creditPacksTable.packKey, String(req.params.packKey)), eq(creditPacksTable.isActive, true))).limit(1);
    if (!pack) return res.status(404).json({ error: "CREDIT_PACK_NOT_FOUND", message: "The selected credit pack is not available" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!user?.email) return res.status(422).json({ error: "BILLING_EMAIL_REQUIRED", message: "A verified account email is required for checkout" });
    const orderKey = `gwo_${crypto.randomUUID().replace(/-/g, "")}`;
    const reference = paymentReference(orderKey);
    const [order] = await db.insert(productOrdersTable).values({ orderKey, workspaceId: context.workspace.id, productId: context.product.id, packId: pack.id, purchasedByUserId: req.userId, paymentReference: reference, amount: pack.price, currency: pack.currency, credits: pack.credits }).returning();
    const callbackUrl = process.env.PAYSTACK_WALLET_CALLBACK_URL;
    if (!callbackUrl) return res.status(503).json({ error: "WALLET_CHECKOUT_NOT_CONFIGURED", message: "Wallet checkout callback is not configured" });
    const gatewayResponse = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackSecret()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(Number(pack.price) * 100), currency: pack.currency, reference, email: user.email, callback_url: callbackUrl, metadata: { walletOrderKey: orderKey, workspaceKey: context.workspace.workspaceKey, productKey: context.product.productKey, packKey: pack.packKey, credits: pack.credits } }),
    });
    const data = await gatewayResponse.json() as any;
    if (!gatewayResponse.ok || !data?.status) return res.status(502).json({ error: "PAYMENT_INITIALIZATION_FAILED", message: data?.message ?? "Unable to initialize wallet checkout" });
    return res.status(201).json({ orderKey, paymentReference: reference, authorizationUrl: data.data.authorization_url, accessCode: data.data.access_code, credits: pack.credits, amount: Number(pack.price), currency: pack.currency });
  } catch (error) { return walletError(res, error); }
});

router.post("/payments/paystack/verify/:reference", requireAuth, async (req, res) => {
  try {
    if (!req.userId) return res.status(404).json({ error: "USER_NOT_READY" });
    const reference = String(req.params.reference);
    const [order] = await db.select().from(productOrdersTable).where(eq(productOrdersTable.paymentReference, reference)).limit(1);
    if (!order) return res.status(404).json({ error: "WALLET_ORDER_NOT_FOUND" });
    const context = await ensureWorkspaceWallet(req.userId);
    if (order.workspaceId !== context.workspace.id) return res.status(403).json({ error: "WORKSPACE_ACCESS_DENIED" });
    const verification = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${paystackSecret()}` } });
    const data = await verification.json() as any;
    const tx = data?.data;
    const verified = verification.ok && data?.status && tx?.status === "success" && Number(tx.amount) === Math.round(Number(order.amount) * 100) && tx.currency === order.currency;
    if (!verified) return res.json({ paid: false, orderKey: order.orderKey, status: tx?.status ?? "unknown" });
    const settled = await settleCreditPurchase(order.orderKey);
    const wallet = settled.account ?? (await ensureWorkspaceWallet(req.userId)).account;
    return res.json({ paid: true, order: { key: settled.order.orderKey, credits: settled.order.credits, status: settled.order.status }, wallet: { availableCredits: wallet.availableCredits, reservedCredits: wallet.reservedCredits, neverExpires: true } });
  } catch (error) { return walletError(res, error); }
});

router.post("/payments/paystack/webhook", async (req: RawBodyRequest, res) => {
  try {
    if (!walletWebhookSignatureIsValid(req)) return res.sendStatus(401);
    const event = req.body as any;
    if (event?.event !== "charge.success" || !event?.data?.reference) return res.sendStatus(200);
    const reference = String(event.data.reference);
    const [order] = await db.select().from(productOrdersTable).where(eq(productOrdersTable.paymentReference, reference)).limit(1);
    if (!order) return res.sendStatus(200);
    const amountMatches = Number(event.data.amount) === Math.round(Number(order.amount) * 100);
    const currencyMatches = event.data.currency === order.currency;
    if (!amountMatches || !currencyMatches) return res.status(400).json({ error: "WALLET_PAYMENT_MISMATCH" });
    await settleCreditPurchase(order.orderKey);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Wallet Paystack webhook error", error);
    return res.sendStatus(500);
  }
});

export default router;
