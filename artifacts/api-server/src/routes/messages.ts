import { Router } from "express";
import { db, messagesTable, projectsTable, usersTable, activityTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/messages
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  const userId = req.userId;

  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (req.userRole !== "admin" && project[0].userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db.select({
    id: messagesTable.id,
    projectId: messagesTable.projectId,
    senderId: messagesTable.senderId,
    senderName: usersTable.name,
    senderRole: usersTable.role,
    content: messagesTable.content,
    fileUrl: messagesTable.fileUrl,
    fileName: messagesTable.fileName,
    isRead: messagesTable.isRead,
    createdAt: messagesTable.createdAt,
  })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.projectId, projectId))
    .orderBy(sql`${messagesTable.createdAt} ASC`);

  res.json(messages.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })));
});

// POST /api/projects/:projectId/messages
router.post("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId);
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (req.userRole !== "admin" && project[0].userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { content, fileUrl, fileName } = req.body;

  const [msg] = await db.insert(messagesTable).values({
    projectId,
    senderId: userId,
    content,
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    isRead: false,
  }).returning();

  // Log activity for project owner
  await db.insert(activityTable).values({
    userId: project[0].userId,
    projectId,
    type: "admin_response",
    description: `New message in project: ${project[0].title}`,
  });

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({
    id: msg.id,
    projectId: msg.projectId,
    senderId: msg.senderId,
    senderName: sender?.name ?? "Unknown",
    senderRole: sender?.role ?? "client",
    content: msg.content,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    isRead: msg.isRead,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
