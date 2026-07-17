import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(notificationsTable.createdAt);

  res.json(notifications.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ updated: 1 });
});

// POST /api/notifications/:id/read
router.post("/:id/read", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const id = parseInt(req.params.id as string);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

export default router;
