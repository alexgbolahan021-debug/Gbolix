import crypto from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import {
  aiAgentSubscriptionEventsTable,
  aiAgentSubscriptionPlansTable,
  aiAgentSubscriptionsTable,
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
import { CREDIT_AUTHORIZATION_TTL_MS, GBOLIX_AI_AGENT_PRODUCT_KEY, GBOLIX_LEADS_PRODUCT_KEY, aiAgentCapabilitiesForLevel, aiAgentSubscriptionPlanDefinitions, approvedCreditPacks, calculateReleasedCredits } from "./walletPolicy";

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

  await db.insert(productsTable).values({
    productKey: GBOLIX_AI_AGENT_PRODUCT_KEY,
    displayName: "Gbolix AI Agent",
    marketingName: "Gbolix AI Agent",
    description: "Configurable AI workers for business conversations and tasks.",
    status: "private_beta",
    usageModel: "hybrid",
  }).onConflictDoNothing({ target: productsTable.productKey });
  await db.update(productsTable).set({ usageModel: "hybrid", updatedAt: NOW() }).where(eq(productsTable.productKey, GBOLIX_AI_AGENT_PRODUCT_KEY));
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

export async function ensureAIAgentWorkspaceWallet(workspaceKey: string, displayName?: string) {
  await ensureWalletFoundation();
  const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.workspaceKey, workspaceKey)).limit(1);
  if (!workspace) throw new WalletError("WORKSPACE_NOT_FOUND", "The Gbolix workspace could not be resolved", 404);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.productKey, GBOLIX_AI_AGENT_PRODUCT_KEY)).limit(1);
  if (!product) throw new WalletError("PRODUCT_CONFIGURATION_ERROR", "Gbolix AI Agent product configuration could not be loaded", 500);
  await db.insert(creditAccountsTable).values({ workspaceId: workspace.id }).onConflictDoNothing({ target: creditAccountsTable.workspaceId });
  await db.insert(productEntitlementsTable).values({ workspaceId: workspace.id, productId: product.id, status: "inactive" }).onConflictDoNothing({ target: [productEntitlementsTable.workspaceId, productEntitlementsTable.productId] });
  const [account] = await db.select().from(creditAccountsTable).where(eq(creditAccountsTable.workspaceId, workspace.id)).limit(1);
  const [entitlement] = await db.select().from(productEntitlementsTable).where(and(eq(productEntitlementsTable.workspaceId, workspace.id), eq(productEntitlementsTable.productId, product.id))).limit(1);
  if (!account || !entitlement) throw new WalletError("WALLET_CONFIGURATION_ERROR", "AI Agent wallet context could not be initialized", 500);
  return { product, workspace, account, entitlement };
}

export async function reserveAIAgentCredits(input: { workspaceKey: string; requestKey: string; maximumCredits: number; agentId?: string }) {
  if (!Number.isInteger(input.maximumCredits) || input.maximumCredits <= 0) throw new WalletError("INVALID_CREDIT_RESERVATION", "Maximum credits must be a positive integer");
  const context = await ensureAIAgentWorkspaceWallet(input.workspaceKey);
  const existing = await db.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.requestKey, input.requestKey)).limit(1);
  if (existing[0]) return { authorization: existing[0], reused: true, context };
  return db.transaction(async tx => {
    const [current] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, context.account.id)).limit(1);
    if (!current || current.availableCredits < input.maximumCredits) throw new WalletError("INSUFFICIENT_CREDITS", "Your workspace does not have enough available Gbolix Wallet credits", 409);
    const [updated] = await tx.update(creditAccountsTable).set({ availableCredits: current.availableCredits - input.maximumCredits, reservedCredits: current.reservedCredits + input.maximumCredits, version: current.version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, current.id), eq(creditAccountsTable.version, current.version), gte(creditAccountsTable.availableCredits, input.maximumCredits))).returning();
    if (!updated) throw new WalletError("CREDIT_RESERVATION_CONFLICT", "Your wallet changed while this request was starting. Please try again.", 409);
    const authorizationKey = makeKey("gca");
    const [authorization] = await tx.insert(creditAuthorizationsTable).values({ authorizationKey, requestKey: input.requestKey, accountId: current.id, workspaceId: context.workspace.id, productId: context.product.id, maximumCredits: input.maximumCredits, expiresAt: new Date(Date.now() + CREDIT_AUTHORIZATION_TTL_MS) }).returning();
    await tx.insert(creditLedgerEntriesTable).values({ accountId: current.id, workspaceId: context.workspace.id, productId: context.product.id, entryType: "reserve", credits: -input.maximumCredits, idempotencyKey: `reserve:${input.requestKey}`, sourceType: "gbolix_ai_agent", sourceKey: input.requestKey, metadata: { authorizationKey, agentId: input.agentId } });
    return { authorization, reused: false, context: { ...context, account: updated } };
  });
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

export async function finalizeCredits(input: { authorizationKey: string; finalizedCredits: number; usageEventKey: string; sourceType?: string; metadata?: Record<string, unknown> }) {
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
    if (input.finalizedCredits > 0) await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "finalize", credits: -input.finalizedCredits, idempotencyKey: `finalize:${input.usageEventKey}`, sourceType: input.sourceType ?? "leads_usage", sourceKey: input.usageEventKey, metadata: input.metadata ?? {} }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    if (releasedCredits > 0) await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "release", credits: releasedCredits, idempotencyKey: `release:${input.usageEventKey}`, sourceType: input.sourceType ?? "leads_usage", sourceKey: input.usageEventKey, metadata: input.metadata ?? {} }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    const [finalized] = await tx.update(creditAuthorizationsTable).set({ state: "finalized", finalizedCredits: input.finalizedCredits, releasedCredits, updatedAt: NOW() }).where(eq(creditAuthorizationsTable.id, authorization.id)).returning();
    return { authorization: finalized, account: updated, reused: false };
  });
}

export async function releaseCredits(input: { authorizationKey: string; releaseKey: string; reason: string; sourceType?: string }) {
  return db.transaction(async tx => {
    const [authorization] = await tx.select().from(creditAuthorizationsTable).where(eq(creditAuthorizationsTable.authorizationKey, input.authorizationKey)).limit(1);
    if (!authorization) throw new WalletError("CREDIT_AUTHORIZATION_NOT_FOUND", "Credit authorization was not found", 404);
    if (authorization.state === "released" || authorization.state === "cancelled") return { authorization, reused: true };
    if (authorization.state !== "reserved") throw new WalletError("CREDIT_AUTHORIZATION_NOT_RELEASABLE", "Only reserved credits can be released", 409);
    const [account] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, authorization.accountId)).limit(1);
    if (!account || account.reservedCredits < authorization.maximumCredits) throw new WalletError("CREDIT_LEDGER_INTEGRITY_ERROR", "Reserved balance cannot be released", 409);
    const [updated] = await tx.update(creditAccountsTable).set({ availableCredits: account.availableCredits + authorization.maximumCredits, reservedCredits: account.reservedCredits - authorization.maximumCredits, version: account.version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, account.id), eq(creditAccountsTable.version, account.version))).returning();
    if (!updated) throw new WalletError("CREDIT_RELEASE_CONFLICT", "Wallet changed while releasing credits", 409);
    await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: authorization.workspaceId, productId: authorization.productId, entryType: "release", credits: authorization.maximumCredits, idempotencyKey: `release:${input.releaseKey}`, sourceType: input.sourceType ?? "leads_release", sourceKey: input.releaseKey, metadata: { reason: input.reason } }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey });
    const [released] = await tx.update(creditAuthorizationsTable).set({ state: "released", releasedCredits: authorization.maximumCredits, updatedAt: NOW() }).where(eq(creditAuthorizationsTable.id, authorization.id)).returning();
    return { authorization: released, account: updated, reused: false };
  });
}

export async function ensureAIAgentSubscriptionPlans() {
  await ensureWalletFoundation();

  for (const definition of aiAgentSubscriptionPlanDefinitions) {
    const paystackPlanCode = process.env[definition.paystackPlanCodeEnv]?.trim();
    if (!paystackPlanCode) continue;
    await db.insert(aiAgentSubscriptionPlansTable).values({
      planKey: definition.planKey,
      level: definition.level,
      displayPriceUsd: definition.displayPriceUsd,
      paystackPlanCode,
      monthlyCredits: definition.monthlyCredits,
      currency: process.env.PAYSTACK_AI_AGENT_CURRENCY?.trim() || "NGN",
      isActive: true,
    }).onConflictDoUpdate({
      target: aiAgentSubscriptionPlansTable.planKey,
      set: { level: definition.level, displayPriceUsd: definition.displayPriceUsd, paystackPlanCode, monthlyCredits: definition.monthlyCredits, isActive: true, updatedAt: NOW() },
    });
  }
  return db.select().from(aiAgentSubscriptionPlansTable).where(eq(aiAgentSubscriptionPlansTable.isActive, true));
}

export async function createAIAgentSubscriptionCheckout(input: { userId: number; planKey: string; paymentReference: string; metadata?: Record<string, unknown> }) {
  const context = await ensureAIAgentWorkspaceWallet(`gws_user_${input.userId}`);
  const plans = await ensureAIAgentSubscriptionPlans();
  const plan = plans.find(item => item.planKey === input.planKey);
  if (!plan) throw new WalletError("SUBSCRIPTION_PLAN_NOT_CONFIGURED", "This AI Agent subscription plan is not configured yet", 503);
  const subscriptionKey = makeKey("gsub");
  const [subscription] = await db.insert(aiAgentSubscriptionsTable).values({
    subscriptionKey,
    workspaceId: context.workspace.id,
    productId: context.product.id,
    planId: plan.id,
    purchasedByUserId: input.userId,
    planKey: plan.planKey,
    level: plan.level,
    paymentReference: input.paymentReference,
    amountSubunit: plan.paystackAmountSubunit ?? undefined,
    currency: plan.currency,
    metadata: { source: "ai_agent_plan_picker", ...(input.metadata ?? {}) },
  }).returning();
  if (!subscription) throw new WalletError("SUBSCRIPTION_CREATE_FAILED", "The subscription checkout could not be created", 500);
  return { subscription, plan, context };
}

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export async function linkAIAgentSubscriptionProvider(input: { subscriptionId: number; paystackCustomerCode?: string; paystackSubscriptionCode?: string; encryptedEmailToken?: string; amountSubunit?: number; currency?: string; nextPaymentAt?: Date }) {
  const [updated] = await db.update(aiAgentSubscriptionsTable).set({ paystackCustomerCode: input.paystackCustomerCode, paystackSubscriptionCode: input.paystackSubscriptionCode, paystackEmailTokenEncrypted: input.encryptedEmailToken, amountSubunit: input.amountSubunit, currency: input.currency, nextPaymentAt: input.nextPaymentAt, updatedAt: NOW() }).where(eq(aiAgentSubscriptionsTable.id, input.subscriptionId)).returning();
  return updated;
}

export async function settleAIAgentSubscriptionPayment(input: {
  paymentReference: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  encryptedEmailToken?: string;
  amountSubunit?: number;
  currency?: string;
  billingPeriodKey?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  nextPaymentAt?: Date;
}) {
  return db.transaction(async tx => {
    const [subscription] = await tx.select().from(aiAgentSubscriptionsTable).where(eq(aiAgentSubscriptionsTable.paymentReference, input.paymentReference)).limit(1);
    if (!subscription) throw new WalletError("SUBSCRIPTION_NOT_FOUND", "AI Agent subscription checkout was not found", 404);
    const [plan] = await tx.select().from(aiAgentSubscriptionPlansTable).where(eq(aiAgentSubscriptionPlansTable.id, subscription.planId)).limit(1);
    if (!plan) throw new WalletError("SUBSCRIPTION_PLAN_NOT_FOUND", "AI Agent subscription plan was not found", 500);
    if (input.currency && plan.currency && input.currency !== plan.currency) throw new WalletError("SUBSCRIPTION_CURRENCY_MISMATCH", "Paystack returned an unexpected subscription currency", 409);
    if (plan.paystackAmountSubunit && input.amountSubunit && plan.paystackAmountSubunit !== input.amountSubunit) {
      console.warn("AI Agent subscription amount mismatch", {
        paymentReference: input.paymentReference,
        planKey: subscription.planKey,
        configuredAmountSubunit: plan.paystackAmountSubunit,
        receivedAmountSubunit: input.amountSubunit,
        configuredCurrency: plan.currency,
        receivedCurrency: input.currency ?? null,
      });
      throw new WalletError("SUBSCRIPTION_AMOUNT_MISMATCH", "Paystack returned an unexpected subscription amount", 409);
    }

    const periodStart = input.currentPeriodStart ?? subscription.currentPeriodStart ?? NOW();
    const periodEnd = input.currentPeriodEnd ?? subscription.currentPeriodEnd ?? addOneMonth(periodStart);
    const [updatedSubscription] = await tx.update(aiAgentSubscriptionsTable).set({
      state: "active",
      paystackCustomerCode: input.paystackCustomerCode ?? subscription.paystackCustomerCode,
      paystackSubscriptionCode: input.paystackSubscriptionCode ?? subscription.paystackSubscriptionCode,
      paystackEmailTokenEncrypted: input.encryptedEmailToken ?? subscription.paystackEmailTokenEncrypted,
      amountSubunit: input.amountSubunit ?? subscription.amountSubunit,
      currency: input.currency ?? subscription.currency ?? plan.currency,
      initialPaymentAt: subscription.initialPaymentAt ?? NOW(),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextPaymentAt: input.nextPaymentAt ?? subscription.nextPaymentAt ?? periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: NOW(),
    }).where(eq(aiAgentSubscriptionsTable.id, subscription.id)).returning();

    const [entitlement] = await tx.insert(productEntitlementsTable).values({
      workspaceId: subscription.workspaceId,
      productId: subscription.productId,
      status: "active",
      planKey: subscription.planKey,
      capabilities: aiAgentCapabilitiesForLevel(subscription.level),
      startsAt: periodStart,
      endsAt: periodEnd,
    }).onConflictDoUpdate({
      target: [productEntitlementsTable.workspaceId, productEntitlementsTable.productId],
      set: { status: "active", planKey: subscription.planKey, capabilities: aiAgentCapabilitiesForLevel(subscription.level), startsAt: periodStart, endsAt: periodEnd, updatedAt: NOW() },
    }).returning();

    const account = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.workspaceId, subscription.workspaceId)).limit(1);
    if (!account[0]) throw new WalletError("WALLET_NOT_FOUND", "Wallet account was not found", 500);
    const grantKey = `ai-agent-subscription:${subscription.id}:${input.billingPeriodKey ?? input.paymentReference}`;
    const [grant] = await tx.insert(creditLedgerEntriesTable).values({
      accountId: account[0].id,
      workspaceId: subscription.workspaceId,
      productId: subscription.productId,
      entryType: "grant",
      credits: plan.monthlyCredits,
      idempotencyKey: grantKey,
      sourceType: "ai_agent_subscription",
      sourceKey: subscription.subscriptionKey,
      metadata: { planKey: plan.planKey, level: plan.level, billingPeriodKey: input.billingPeriodKey ?? input.paymentReference, paymentReference: input.paymentReference },
    }).onConflictDoNothing({ target: creditLedgerEntriesTable.idempotencyKey }).returning();
    let updatedAccount = account[0];
    if (grant) {
      const [nextAccount] = await tx.update(creditAccountsTable).set({ availableCredits: account[0].availableCredits + plan.monthlyCredits, version: account[0].version + 1, updatedAt: NOW() }).where(and(eq(creditAccountsTable.id, account[0].id), eq(creditAccountsTable.version, account[0].version))).returning();
      if (!nextAccount) throw new WalletError("CREDIT_GRANT_CONFLICT", "Wallet changed while granting subscription credits", 409);
      updatedAccount = nextAccount;
    }
    return { subscription: updatedSubscription, entitlement, plan, account: updatedAccount, granted: Boolean(grant) };
  });
}

export async function updateAIAgentSubscriptionState(input: { subscriptionCode?: string; paymentReference?: string; state: "active" | "past_due" | "non_renewing" | "cancelled"; nextPaymentAt?: Date; currentPeriodEnd?: Date }) {
  return db.transaction(async tx => {
    const conditions = input.subscriptionCode
      ? eq(aiAgentSubscriptionsTable.paystackSubscriptionCode, input.subscriptionCode)
      : input.paymentReference ? eq(aiAgentSubscriptionsTable.paymentReference, input.paymentReference) : undefined;
    if (!conditions) throw new WalletError("SUBSCRIPTION_IDENTIFIER_REQUIRED", "A subscription identifier is required", 400);
    const [subscription] = await tx.select().from(aiAgentSubscriptionsTable).where(conditions).limit(1);
    if (!subscription) throw new WalletError("SUBSCRIPTION_NOT_FOUND", "AI Agent subscription was not found", 404);
    const [updated] = await tx.update(aiAgentSubscriptionsTable).set({ state: input.state, cancelAtPeriodEnd: input.state === "non_renewing", nextPaymentAt: input.nextPaymentAt ?? subscription.nextPaymentAt, currentPeriodEnd: input.currentPeriodEnd ?? subscription.currentPeriodEnd, updatedAt: NOW() }).where(eq(aiAgentSubscriptionsTable.id, subscription.id)).returning();
    if (input.state === "cancelled") {
      await tx.update(productEntitlementsTable).set({ status: "cancelled", endsAt: input.currentPeriodEnd ?? NOW(), updatedAt: NOW() }).where(and(eq(productEntitlementsTable.workspaceId, subscription.workspaceId), eq(productEntitlementsTable.productId, subscription.productId)));
    } else if (input.state === "past_due") {
      await tx.update(productEntitlementsTable).set({ status: "past_due", updatedAt: NOW() }).where(and(eq(productEntitlementsTable.workspaceId, subscription.workspaceId), eq(productEntitlementsTable.productId, subscription.productId)));
    }
    return updated;
  });
}

export async function checkAIAgentEntitlement(workspaceKey: string, requestedLevel: number) {
  const context = await ensureAIAgentWorkspaceWallet(workspaceKey);
  const capabilities = (context.entitlement.capabilities ?? {}) as Record<string, unknown>;
  const currentLevel = Number(capabilities.agentLevel ?? 1);
  const usable = context.entitlement.status === "active" && (!context.entitlement.endsAt || context.entitlement.endsAt.getTime() > Date.now());
  return { allowed: requestedLevel <= 1 || (usable && currentLevel >= requestedLevel), currentLevel, status: context.entitlement.status, planKey: context.entitlement.planKey, endsAt: context.entitlement.endsAt };
}

export async function recordAIAgentSubscriptionEvent(input: { deliveryId: string; eventType: string; providerReference?: string; payload: Record<string, unknown>; payloadDigest: string; subscriptionId?: number }) {
  const [event] = await db.insert(aiAgentSubscriptionEventsTable).values({ deliveryId: input.deliveryId, eventType: input.eventType, providerReference: input.providerReference, payload: input.payload, payloadDigest: input.payloadDigest, subscriptionId: input.subscriptionId, processedAt: NOW() }).onConflictDoNothing({ target: aiAgentSubscriptionEventsTable.deliveryId }).returning();
  return { created: Boolean(event), event };
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
