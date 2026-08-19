import { Router } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db, messagesTable, projectsTable, usersTable, activityTable, notificationsTable } from "@workspace/db";
import { eq, sql, and, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { isStaffRole, normalizeRole } from "../lib/roles";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const s3 = new S3Client({
  region: process.env.B2_REGION!,
  endpoint: process.env.B2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const BUCKET = process.env.B2_BUCKET_NAME!;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function getPublicFileUrl(req: any, filename: string): string {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}/api/files/download/${encodeURIComponent(filename)}`;
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string); const userId = req.userId;
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) { res.status(404).json({ error: "Project not found" }); return; }
  const isStaff = isStaffRole(req.userRole);
  if (!isStaff && project[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const messages = await db.select({ id: messagesTable.id, projectId: messagesTable.projectId, senderId: messagesTable.senderId, senderName: usersTable.name, senderRole: usersTable.role, content: messagesTable.content, fileUrl: messagesTable.fileUrl, fileName: messagesTable.fileName, fileMimeType: messagesTable.fileMimeType, isRead: messagesTable.isRead, createdAt: messagesTable.createdAt }).from(messagesTable).innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id)).where(eq(messagesTable.projectId, projectId)).orderBy(sql`${messagesTable.createdAt} ASC`);
  res.json(messages.map(m => ({
    ...m,
    senderRole: normalizeRole(m.senderRole),
    fileUrl: m.fileUrl && m.fileUrl.startsWith("/") ? getPublicFileUrl(req, m.fileUrl.split("/").pop() ?? "") : m.fileUrl,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string); const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (!project.length) { res.status(404).json({ error: "Project not found" }); return; }
  const isStaff = isStaffRole(req.userRole);
  if (!isStaff && project[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { content, fileData, fileName, fileMimeType } = req.body;
  let fileUrl: string | null = null; let savedFileName: string | null = null; let savedMimeType: string | null = null;

  if (fileData && fileName) {
    const ext = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";
    const unique = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(fileData, "base64");
    if (buffer.length > MAX_ATTACHMENT_SIZE) { res.status(413).json({ error: "Attachment too large. Maximum 10MB" }); return; }

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: unique,
      Body: buffer,
      ContentType: fileMimeType || "application/octet-stream",
    }));

    fileUrl = getPublicFileUrl(req, unique);
    savedFileName = fileName;
    savedMimeType = fileMimeType || "application/octet-stream";
  }

  const [msg] = await db.insert(messagesTable).values({ projectId, senderId: userId, content: content || "", fileUrl, fileName: savedFileName, fileMimeType: savedMimeType, isRead: false }).returning();
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const notifyUserId = isStaff ? project[0].userId : null;
  if (notifyUserId) await db.insert(notificationsTable).values({ userId: notifyUserId, projectId, title: "New Message", message: `${sender?.name ?? "Staff"} sent a message on "${project[0].title}"`, type: "new_message" });
  await db.insert(activityTable).values({ userId: project[0].userId, projectId, type: "admin_response", description: `New message on project: ${project[0].title}` });
  res.status(201).json({ id: msg.id, projectId: msg.projectId, senderId: msg.senderId, senderName: sender?.name ?? "Unknown",     senderRole: normalizeRole(sender?.role),
 content: msg.content, fileUrl: msg.fileUrl, fileName: msg.fileName, fileMimeType: msg.fileMimeType, isRead: msg.isRead, createdAt: msg.createdAt.toISOString() });
});

router.post("/read", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string); const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(messagesTable).set({ isRead: true }).where(and(eq(messagesTable.projectId, projectId), eq(messagesTable.isRead, false), ne(messagesTable.senderId, userId)));
  await db.update(notificationsTable).set({ isRead: true }).where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.projectId, projectId), eq(notificationsTable.isRead, false)));
  res.json({ updated: 1 });
});

export default router;
