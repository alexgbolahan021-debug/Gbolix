import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectCode: text("project_code").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  serviceType: text("service_type", { enum: ["automation", "app_testing", "flutterflow", "presentation_design"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements"),
  status: text("status", { enum: ["pending_review", "needs_info", "approved", "declined", "agreement_sent", "agreement_accepted", "payment_pending", "in_progress", "review", "completed"] }).notNull().default("pending_review"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  price: numeric("price", { precision: 10, scale: 2 }),
  internalNotes: text("internal_notes"),
  hasConversation: boolean("has_conversation").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
