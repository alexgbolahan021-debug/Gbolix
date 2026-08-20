import crypto from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import {
  creditAccountsTable,
  creditAuthorizationsTable,
  creditLedgerEntriesTable,
  creditPacksTable,
  db,
  productEntitlementsTable,
  productsTable,
  workspacesTable,
  workspaceMembershipsTable,
} from "@workspace/db";
import { CREDIT_AUTHORIZATION_TTL_MS, GBOLIX_LEADS_PRODUCT_KEY, approvedCreditPacks, calculateReleasedCredits } from "./walletPolicy";

const NOW = () => new Date();

function makeKey(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export class WalletError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 422) {
    super(message);
  }
}

export async function ensureWalletFoundation() {
  await db.insert(productsTable).values({
    productKey: GBOLIX_LEADS_PRODUCT_KEY,
    displayName: "Gbolix Leads",
    marketingName: "Gbolix Leads",
    description: "Verified lead intelligence for agencies and B2B teams.",
    status: "private_beta",
    usageModel: "credits",
  }).onConflictDoNothing({ target: productsTable.productKey });

  for (const pack of approvedCreditPacks) {
    await db.insert(creditPacksTable).values(pack).onConflictDoNothing({ target: creditPacksTable.packKey });
  }

  const [leadsProduct] = await db.select().from(productsTable).where(eq(productsTable.productKey, GBOLIX_LEADS_PRODUCT_KEY)).limit(1);
  if (!leadsProduct) throw new WalletError("PRODUCT_CONFIGURATION_ERROR", "Gbolix Leads product configuration could not be loaded", 500);
  return leadsProduct;
}

export async function getOrCreateWorkspaceForUser(userId: number, displayName?: string) {
  const membership = await db.select({ workspace: workspacesTable, membership: workspaceMembershipsTable })
    .from(workspaceMembershipsTable)
    .innerJoin(workspacesTable, eq(workspaceMembershipsTable.workspaceId, workspacesTable.id))
    .where(eq(workspaceMembershipsTable.userId, userId))
    .limit(1);
  if (membership[0]) return membership[0];

  const workspaceKey = `gws_user_${userId}`;
  await db.insert(workspacesTable).values({ workspaceKey, displayName: displayName?.trim() || "My Gbolix Workspace" }).onConflictDoNothing({ target: workspacesTable.workspaceKey });
  const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.workspaceKey, workspaceKey)).limit(1);
  if (!workspace) throw new WalletError("WORKSPACE_CONFIGURATION_ERROR", "Workspace could not be created", 500);
  await db.insert(workspaceMembershipsTable).values({ workspaceId: workspace.id, userId, role: "owner" }).onConflictDoNothing();
  const [createdMembership] = await db.select().from(workspaceMembershipsTable).where(and(eq(workspaceMembershipsTable.workspaceId, workspace.id), eq(workspaceMembershipsTable.userId, userId))).limit(1);
  if (!createdMembership) throw new WalletError("WORKSPACE_CONFIGURATION_ERROR", "Workspace membership could not be created", 500);
  return { workspace, membership: createdMembership };
}

export async function ensureWorkspaceWallet(userId: number, displayName?: string) {
  const product = await ensureWalletFoundation();
  const { workspace, membership } = await getOrCreateWorkspaceForUser(userId, displayName);
  await db.insert(creditAccountsTable).values({ workspaceId: workspace.id }).onConflictDoNothing({ target: creditAccountsTable.workspaceId });
  await db.insert(productEntitlementsTable).values({ workspaceId: workspace.id, productId: product.id, status: "inactive" }).onConflictDoNothing({ target: [productEntitlementsTable.workspaceId, productEntitlementsTable.productId] });
  const [account] = await db.select().from(creditAccountsTable).where(eq(creditAccountsTable.workspaceId, workspace.id)).limit(1);
  const [entitlement] = await db.select().from(productEntitlementsTable).where(and(eq(productEntitlementsTable.workspaceId, workspace.id), eq(productEntitlementsTable.productId, product.id))).limit(1);
  if (!account || !entitlement) throw new WalletError("WALLET_CONFIGURATION_ERROR", "Wallet context could not be initialized", 500);
  return { product, workspace, membership, account, entitlement };
}

export async function getWalletContext(userId: number, displayName?: string) {
  const context = await ensureWorkspaceWallet(userId, displayName);
  const packs = await db.select().from(creditPacksTable).where(eq(creditPacksTable.isActive, true)).orderBy(creditPacksTable.sortOrder);
  const entitlements = await db.select({ product: productsTable, entitlement: productEntitlementsTable })
    .from(productEntitlementsTable)
    .innerJoin(productsTable, eq(productEntitlementsTable.productId, productsTable.id))
    .where(eq(productEntitlementsTable.workspaceId, context.workspace.id));
  return { ...context, packs, entitlements };
}

type ReserveInput = { userId: number; requestKey: string; maximumCredits: number; productKey?: string; displayName?: string };

export async function reserveCredits(input: ReserveInput) {
  if (!Number.isInteger(input.maximumCredits) || input.maximumCredits <= 0) throw new WalletError("INVALID_CREDIT_RESERVATION", "Maximum credits must be a positive integer");
  const context = await ensureWorkspaceWallet(input.userId, input.displayName);
  const existing = await db.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.requestKey, input.requestKey)).limit(1);
  if (existing[0]) return { authorization: existing[0], reused: true, context };

  return db.transaction(async tx => {
    const [current] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, context.account.id)).limit(1);
    if (!current || current.availableCredits < input.maximumCredits) throw new WalletError("INSUFFICIENT_CREDITS", "Your workspace does not have enough available Gbolix Wallet credits", 409);
    const [updated] = await tx.update(creditAccountsTable)
      .set({ availableCredits: current.availableCredits - input.maximumCredits, reservedCredits: current.reservedCredits + input.maximumCredits, version: current.version + 1, updatedAt: NOW() })
      .where(and(eq(creditAccountsTable.id, current.id), eq(creditAccountsTable.version, current.version), gte(creditAccountsTable.availableCredits, input.maximumCredits)))
      .returning();
    if (!updated) throw new WalletError("CREDIT_RESERVATION_CONFLICT", "Your wallet changed while this request was starting. Please try again.", 409);
    const authorizationKey = makeKey("gca");
    const [authorization] = await tx.insert(creditAuthorizationsTable).values({
      authorizationKey,
      requestKey: input.requestKey,
      accountId: current.id,
      workspaceId: context.workspace.id,
      productId: context.product.id,
      maximumCredits: input.maximumCredits,
      expiresAt: new Date(Date.now() + CREDIT_AUTHORIZATION_TTL_MS),
    }).returning();
    await tx.insert(creditLedgerEntriesTable).values({
      accountId: current.id,
      workspaceId: context.workspace.id,
      productId: context.product.id,
      entryType: "reserve",
      credits: -input.maximumCredits,
      idempotencyKey: `reserve:${input.requestKey}`,
      sourceType: "leads_request",
      sourceKey: input.requestKey,
      metadata: { authorizationKey },
    });
    return { authorization, reused: false, context: { ...context, account: updated } };
  });
}

export async function finalizeCredits(input: { authorizationKey: string; finalizedCredits: number; usageEventKey: string; metadata?: Record<string, unknown> }) {
  if (!Number.isInteger(input.finalizedCredits) || input.finalizedCredits < 0) throw new WalletError("INVALID_FINAL_USAGE", "Finalized credits must be a non-negative integer");
  return db.transaction(async tx => {
    const [authorization] = await tx.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.authorizationKey, input.authorizationKey)).limit(1);
    if (!authorization) throw new WalletError("CREDIT_AUTHORIZATION_NOT_FOUND", "Credit authorization was not found", 404);
    if (authorization.state === "finalized") return { authorization, reused: true };
    if (authorization.state !== "reserved") throw new WalletError("CREDIT_AUTHORIZATION_NOT_RESERVABLE", "Credit authorization is no longer available for finalization", 409);
    if (authorization.expiresAt.getTime() < Date.now()) throw new WalletError("CREDIT_AUTHORIZATION_EXPIRED", "Credit authorization has expired", 409);
    const releasedCredits = calculateReleasedCredits(authorization.maximumCredits, input.finalizedCredits);
    const [account] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, authorization.accountId)).limit(1);
    if (!account || account.reservedCredits < authorization.maximumCredits) throw new WalletError("CREDIT_LEDGER_INTEGRITY_ERROR", "Reserved credit balance cannot be finalized", 409);
    const [updated] = await tx.update(creditAccountsTable).set({ availableCredits: account.availableCredits + releasedCredits, reservedCredits: account.reservedCredits - authorization.maximumCredits, version: account.version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, account.id), eq(creditAccountsTable.version, account.version))).returning();
    if (!updated) throw new WalletError("CREDIT_FINALIZATION_CONFLICT", "Wallet changed while finalizing usage", 409);
    if (input.finalizedCredits > 0) await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "finalize", credits: -input.finalizedCredits, idempotencyKey: `finalize:${input.usageEventKey}`, sourceType: "leads_usage", sourceKey: input.usageEventKey, metadata: input.metadata ?? {} }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    if (releasedCredits > 0) await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "release", credits: releasedCredits, idempotencyKey: `release:${input.usageEventKey}`, sourceType: "leads_usage", sourceKey: input.usageEventKey, metadata: input.metadata ?? {} }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    const [finalized] = await tx.update(creditAuthorizationsTable).set({ state: "finalized", finalizedCredits: input.finalizedCredits, releasedCredits, updatedAt: NOW() }).where(eq(creditAuthorizationsTable.id, authorization.id)).returning();
    return { authorization: finalized, account: updated, reused: false };
  });
}

export async function releaseCredits(input: { authorizationKey: string; releaseKey: string; reason: string }) {
  return db.transaction(async tx => {
    const [authorization] = await tx.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.authorizationKey, input.authorizationKey)).limit(1);
    if (!authorization) throw new WalletError("CREDIT_AUTHORIZATION_NOT_FOUND", "Credit authorization was not found", 404);
    if (authorization.state === "released" || authorization.state === "cancelled") return { authorization, reused: true };
    if (authorization.state !== "reserved") throw new WalletError("CREDIT_AUTHORIZATION_NOT_RELEASABLE", "Only reserved credits can be released", 409);
    const [account] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, authorization.accountId)).limit(1);
    if (!account || account.reservedCredits < authorization.maximumCredits) throw new WalletError("CREDIT_LEDGER_INTEGRITY_ERROR", "Reserved balance cannot be released", 409);
    const [updated] = await tx.update(creditAccountsTable).set({ availableCredits: account.availableCredits + authorization.maximumCredits, reservedCredits: account.reservedCredits - authorization.maximumCredits, version: account.version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, account.id), eq(creditAccountsTable.version, account.version))).returning();
    if (!updated) throw new WalletError("CREDIT_RELEASE_CONFLICT", "Wallet changed while releasing credits", 409);
    await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "release", credits: authorization.maximumCredits, idempotencyKey: `release:${input.releaseKey}`, sourceType: "leads_release", sourceKey: input.releaseKey, metadata: { reason: input.reason } }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    const [released] = await tx.update(creditAuthorizationsTable).set({ state: "released", releasedCredits: authorization.maximumCredits, updatedAt: NOW() }).where(eq(creditAuthorizationsTable.id, authorization.id)).returning();
    return { authorization: released, account: updated, reused: false };
  });
}

export async function settleCreditPurchase(orderKey: string) {
  const { productOrdersTable } = await import("@workspace/db");
  return db.transaction(async tx => {
    const [order] = await tx.select().from(productOrdersTable).where(eq(productOrdersTable.orderKey, orderKey)).limit(1);
    if (!order) throw new WalletError("ORDER_NOT_FOUND", "Wallet purchase order was not found", 404);
    if (order.status === "paid") return { order, reused: true };
    const [account] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.workspaceId, order.workspaceId)).limit(1);
    if (!account) throw new WalletError("WALLET_NOT_FOUND", "Wallet account was not found", 500);
    const [updatedAccount] = await tx.update(creditAccountsTable).set({ availableCredits: account.availableCredits + order.credits, version: account.version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, account.id), eq(creditAccountsTable.version, account.version))).returning();
    if (!updatedAccount) throw new WalletError("PURCHASE_SETTLEMENT_CONFLICT", "Wallet changed while settling payment", 409);
    await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: order.workspaceId, productId: order.productId, entryType: "purchase", credits: order.credits, idempotencyKey: `purchase:${order.orderKey}`, sourceType: "wallet_purchase", sourceKey: order.orderKey, metadata: { packId: order.packId, paymentReference: order.paymentReference } }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    await tx.insert(productEntitlementsTable).values({ workspaceId: order.workspaceId, productId: order.productId, status: "active", startsAt: NOW() }).onConflictDoUpdate({ target: [productEntitlementsTable.workspaceId, productEntitlementsTable.productId], set: { status: "active", startsAt: NOW(), updatedAt: NOW() } });
    const [paidOrder] = await tx.update(productOrdersTable).set({ status: "paid", paidAt: NOW(), updatedAt: NOW() }).where(eq(productOrdersTable.id, order.id)).returning();
    return { order: paidOrder, account: updatedAccount, reused: false };
  });
}
