import { Router } from "express";
import { db, feedbackTable, usersTable, activityTable, notificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/requireAuth";

const router = Router();
const adminRouter = Router();
const VALID_STATUSES = ["new", "reviewed", "archived"] as const;

type FeedbackStatus = (typeof VALID_STATUSES)[number];

function textValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseFeedback(body: unknown) {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const comment = textValue(input.comment, 2000);
  const rating = Number(input.rating);
  const name = textValue(input.name, 120);
  const email = textValue(input.email, 320).toLowerCase();
  const pageUrl = textValue(input.pageUrl, 500);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5" } as const;
  if (comment.length < 3) return { error: "Feedback must be at least 3 characters" } as const;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address" } as const;
  return { rating, comment, name: name || null, email: email || null, pageUrl: pageUrl || null } as const;
}

async function notifyOwners(feedbackId: number, senderName: string) {
  const owners = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "owner"));
  if (owners.length) {
    await db.insert(notificationsTable).values(owners.map(owner => ({
      userId: owner.id,
      title: "New Feedback Received",
      message: `${senderName} left a ${senderName === "Anonymous visitor" ? "public" : "client"} feedback rating.`,
      type: "admin_reply" as const,
    })));
  }
}

function formatFeedback(row: typeof feedbackTable.$inferSelect, sender?: typeof usersTable.$inferSelect | null) {
  return {
    id: row.id,
    userId: row.userId,
    senderName: row.userId ? sender?.name ?? row.name ?? "Registered client" : row.name ?? "Anonymous visitor",
    senderEmail: row.userId ? sender?.email ?? row.email ?? null : row.email ?? null,
    rating: row.rating,
    comment: row.comment,
    source: row.source,
    pageUrl: row.pageUrl,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/public", async (req, res): Promise<void> => {
  const parsed = parseFeedback(req.body);
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [feedback] = await db.insert(feedbackTable).values({ ...parsed, source: "public" }).returning();
  await notifyOwners(feedback.id, parsed.name ?? "Anonymous visitor");
  res.status(201).json(formatFeedback(feedback));
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = parseFeedback(req.body);
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  const [feedback] = await db.insert(feedbackTable).values({ ...parsed, userId: req.userId, name: user?.name ?? parsed.name, email: user?.email ?? parsed.email, source: "workspace" }).returning();
  await notifyOwners(feedback.id, user?.name ?? "Registered client");
  res.status(201).json(formatFeedback(feedback, user as typeof usersTable.$inferSelect));
});

router.get("/mine", requireAuth, async (req, res): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(feedbackTable).where(eq(feedbackTable.userId, req.userId)).orderBy(desc(feedbackTable.createdAt));
  res.json(rows.map(row => formatFeedback(row)));
});

adminRouter.get("/", requireAdmin, async (req, res): Promise<void> => {
  const requestedStatus = String(req.query.status ?? "all");
  const requestedSource = String(req.query.source ?? "all");
  const conditions = [];
  if (VALID_STATUSES.includes(requestedStatus as FeedbackStatus)) conditions.push(eq(feedbackTable.status, requestedStatus as FeedbackStatus));
  if (requestedSource === "workspace" || requestedSource === "public") conditions.push(eq(feedbackTable.source, requestedSource));
  const rows = await db.select({ feedback: feedbackTable, sender: usersTable }).from(feedbackTable).leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(feedbackTable.createdAt));
  res.json(rows.map(row => formatFeedback(row.feedback, row.sender)));
});

adminRouter.patch("/:id/status", requireAdmin, async (req, res): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number.parseInt(req.params.id as string, 10);
  const status = String(req.body?.status ?? "") as FeedbackStatus;
  if (!Number.isInteger(id) || !VALID_STATUSES.includes(status)) { res.status(400).json({ error: "Invalid feedback status" }); return; }
  const [feedback] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id)).limit(1);
  if (!feedback) { res.status(404).json({ error: "Feedback not found" }); return; }
  const [updated] = await db.update(feedbackTable).set({ status, reviewedAt: status === "new" ? null : new Date(), reviewedByUserId: status === "new" ? null : req.userId }).where(eq(feedbackTable.id, id)).returning();
  await db.insert(activityTable).values({ userId: req.userId, type: "status_change", description: `Admin #${req.userId} changed feedback #${id} from ${feedback.status} to ${status}.` });
  res.json(formatFeedback(updated));
});

export { adminRouter as adminFeedbackRouter };
export default router;
