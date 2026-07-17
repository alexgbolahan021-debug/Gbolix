import { Router } from "express";
import { db, messagesTable, projectsTable, usersTable, activityTable, notificationsTable } from "@workspace/db";
import { eq, sql, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router({ mergeParams: true });
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// GET /api/projects/:projectId/messages
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.userId;

  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) { res.status(404).json({ error: "Project not found" }); return; }

  const isStaff = ["owner", "admin", "freelancer"].includes(req.userRole ?? "");
  if (!isStaff && project[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await db.select({
    id: messagesTable.id,
    projectId: messagesTable.projectId,
    senderId: messagesTable.senderId,
    senderName: usersTable.name,
    senderRole: usersTable.role,
    content: messagesTable.content,
    fileUrl: messagesTable.fileUrl,
    fileName: messagesTable.fileName,
    fileMimeType: messagesTable.fileMimeType,
    isRead: messagesTable.isRead,
    createdAt: messagesTable.createdAt,
  })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.projectId, projectId))
    .orderBy(sql`${messagesTable.createdAt} ASC`);

  res.json(messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// POST /api/projects/:projectId/messages
router.post("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) { res.status(404).json({ error: "Project not found" }); return; }

  const isStaff = ["owner", "admin", "freelancer"].includes(req.userRole ?? "");
  if (!isStaff && project[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { content, fileData, fileName, fileMimeType } = req.body;

  // Save file if provided
  let fileUrl: string | null = null;
  let savedFileName: string | null = null;
  let savedMimeType: string | null = null;
  if (fileData && fileName) {
    const ext = path.extname(fileName);
    const unique = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, unique);
    const buffer = Buffer.from(fileData, "base64");
    fs.writeFileSync(filePath, buffer);
    fileUrl = `/api/files/download/${unique}`;
    savedFileName = fileName;
    savedMimeType = fileMimeType || "application/octet-stream";
  }

  const [msg] = await db.insert(messagesTable).values({
    projectId,
    senderId: userId,
    content: content || "",
    fileUrl,
    fileName: savedFileName,
    fileMimeType: savedMimeType,
    isRead: false,
  }).returning();

  // Notify the other party
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const notifyUserId = isStaff ? project[0].userId : null;

  if (notifyUserId) {
    await db.insert(notificationsTable).values({
      userId: notifyUserId,
      projectId,
      title: "New Message",
      message: `${sender?.name ?? "Staff"} sent a message on "${project[0].title}"`,
      type: "new_message",
    });
  }

  await db.insert(activityTable).values({
    userId: project[0].userId,
    projectId,
    type: "admin_response",
    description: `New message on project: ${project[0].title}`,
  });

  res.status(201).json({
    id: msg.id,
    projectId: msg.projectId,
    senderId: msg.senderId,
    senderName: sender?.name ?? "Unknown",
    senderRole: sender?.role ?? "client",
    content: msg.content,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    fileMimeType: msg.fileMimeType,
    isRead: msg.isRead,
    createdAt: msg.createdAt.toISOString(),
  });
});

// POST /api/projects/:projectId/messages/read — mark all as read
router.post("/read", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string);
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(
      eq(messagesTable.projectId, projectId),
      eq(messagesTable.isRead, false),
      ne(messagesTable.senderId, userId),
    ));

  res.json({ updated: 1 });
});

export default router;
