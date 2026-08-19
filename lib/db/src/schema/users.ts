import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  companyName: text("company_name"),
  phone: text("phone"),
  website: text("website"),
  country: text("country"),
  city: text("city"),
  userType: text("user_type"),
  companySize: text("company_size"),
  acquisitionSource: text("acquisition_source"),
  timezone: text("timezone"),
  language: text("language"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  role: text("role", { enum: ["owner", "admin", "specialist", "client"] }).notNull().default("client"),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
