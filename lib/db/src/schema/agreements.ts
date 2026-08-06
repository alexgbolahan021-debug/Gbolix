import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const agreementsTable = pgTable("agreements", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  deliverables: text("deliverables").notNull(),
  timeline: text("timeline").notNull(),
  revisions: text("revisions").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  terms: text("terms").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByUserId: integer("accepted_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgreementSchema = createInsertSchema(agreementsTable).omit({ id: true, createdAt: true });
export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Agreement = typeof agreementsTable.$inferSelect;