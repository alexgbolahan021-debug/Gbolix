import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  workspaceKey: text("workspace_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  status: text("status", { enum: ["active", "suspended", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const workspaceMembershipsTable = pgTable("workspace_memberships", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "member", "billing_manager", "viewer"] }).notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({ workspaceUserUnique: unique("workspace_memberships_workspace_user_unique").on(table.workspaceId, table.userId) }));

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  productKey: text("product_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  marketingName: text("marketing_name").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["coming_soon", "private_beta", "active", "paused", "retired"] }).notNull().default("coming_soon"),
  usageModel: text("usage_model", { enum: ["credits", "subscription", "hybrid"] }).notNull().default("credits"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const creditPacksTable = pgTable("credit_packs", {
  id: serial("id").primaryKey(),
  packKey: text("pack_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  credits: integer("credits").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  badge: text("badge"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productEntitlementsTable = pgTable("product_entitlements", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["inactive", "trialing", "active", "past_due", "suspended", "cancelled", "expired"] }).notNull().default("inactive"),
  planKey: text("plan_key").notNull().default("wallet-v1"),
  capabilities: jsonb("capabilities").notNull().default({}),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({ workspaceProductUnique: unique("product_entitlements_workspace_product_unique").on(table.workspaceId, table.productId) }));

export const creditAccountsTable = pgTable("credit_accounts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  availableCredits: integer("available_credits").notNull().default(0),
  reservedCredits: integer("reserved_credits").notNull().default(0),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({ workspaceUnique: unique("credit_accounts_workspace_unique").on(table.workspaceId) }));

export const creditLedgerEntriesTable = pgTable("credit_ledger_entries", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => creditAccountsTable.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  entryType: text("entry_type", { enum: ["purchase", "grant", "reserve", "finalize", "release", "refund", "adjustment"] }).notNull(),
  credits: integer("credits").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  sourceType: text("source_type").notNull(),
  sourceKey: text("source_key").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditAuthorizationsTable = pgTable("credit_authorizations", {
  id: serial("id").primaryKey(),
  authorizationKey: text("authorization_key").notNull().unique(),
  requestKey: text("request_key").notNull().unique(),
  accountId: integer("account_id").notNull().references(() => creditAccountsTable.id, { onDelete: "restrict" }),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "restrict" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  maximumCredits: integer("maximum_credits").notNull(),
  finalizedCredits: integer("finalized_credits").notNull().default(0),
  releasedCredits: integer("released_credits").notNull().default(0),
  state: text("state", { enum: ["reserved", "finalized", "released", "cancelled", "expired"] }).notNull().default("reserved"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productOrdersTable = pgTable("product_orders", {
  id: serial("id").primaryKey(),
  orderKey: text("order_key").notNull().unique(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "restrict" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  packId: integer("pack_id").notNull().references(() => creditPacksTable.id, { onDelete: "restrict" }),
  purchasedByUserId: integer("purchased_by_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  paymentReference: text("payment_reference").notNull().unique(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  credits: integer("credits").notNull(),
  status: text("status", { enum: ["pending", "paid", "failed", "cancelled"] }).notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const leadsRequestsTable = pgTable("leads_requests", {
  id: serial("id").primaryKey(),
  requestKey: text("request_key").notNull().unique(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "restrict" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "restrict" }),
  requestedByUserId: integer("requested_by_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  creditAuthorizationId: integer("credit_authorization_id").notNull().references(() => creditAuthorizationsTable.id, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull(),
  requestSpec: jsonb("request_spec").notNull(),
  requestedLeadCount: integer("requested_lead_count").notNull(),
  engineJobKey: text("engine_job_key"),
  resultSetKey: text("result_set_key"),
  status: text("status", { enum: ["queued", "running", "partially_complete", "results_ready", "finalizing_credit", "completed", "cancel_requested", "cancelled", "failed"] }).notNull().default("queued"),
  processedLeads: integer("processed_leads").notNull().default(0),
  qualifiedLeads: integer("qualified_leads").notNull().default(0),
  duplicateLeads: integer("duplicate_leads").notNull().default(0),
  lastErrorCode: text("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({ workspaceIdempotencyUnique: unique("leads_requests_workspace_idempotency_unique").on(table.workspaceId, table.idempotencyKey) }));

export const leadsIntegrationEventsTable = pgTable("leads_integration_events", {
  id: serial("id").primaryKey(),
  deliveryId: text("delivery_id").notNull().unique(),
  requestId: integer("request_id").references(() => leadsRequestsTable.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  payloadDigest: text("payload_digest").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Workspace = typeof workspacesTable.$inferSelect;
export type WorkspaceMembership = typeof workspaceMembershipsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type CreditPack = typeof creditPacksTable.$inferSelect;
export type ProductEntitlement = typeof productEntitlementsTable.$inferSelect;
export type CreditAccount = typeof creditAccountsTable.$inferSelect;
export type CreditLedgerEntry = typeof creditLedgerEntriesTable.$inferSelect;
export type CreditAuthorization = typeof creditAuthorizationsTable.$inferSelect;
export type ProductOrder = typeof productOrdersTable.$inferSelect;
export type LeadsRequest = typeof leadsRequestsTable.$inferSelect;
export type LeadsIntegrationEvent = typeof leadsIntegrationEventsTable.$inferSelect;

export const creditPackDefinitions = [
  { packKey: "starter-100", displayName: "Starter Pack", credits: 100, price: "15.00", currency: "USD", badge: null, sortOrder: 10 },
  { packKey: "growth-250", displayName: "Growth Pack", credits: 250, price: "29.00", currency: "USD", badge: null, sortOrder: 20 },
  { packKey: "professional-500", displayName: "Professional Pack", credits: 500, price: "49.00", currency: "USD", badge: "Most Popular", sortOrder: 30 },
  { packKey: "scale-1000", displayName: "Scale Pack", credits: 1000, price: "89.00", currency: "USD", badge: "Best Value", sortOrder: 40 },
] as const;
