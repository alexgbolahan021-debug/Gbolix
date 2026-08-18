import { Router } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db, filesTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const s3 = new S3Client({
  region: process.env.B2_REGION!,
  endpoint: process.env.B2_ENDPOINT!,
  credentials: { accessKeyId: process.env.B2_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const BUCKET = process.env.B2_BUCKET_NAME!;

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.json([]); return; }
  const { projectId } = req.query;
  const conditions = [eq(filesTable.userId, userId)];
  if (projectId) conditions.push(eq(filesTable.projectId, parseInt(projectId as string)));
  const files = await db.select().from(filesTable).where(and(...conditions));
  res.json(files.map(formatFile));
});

router.post("/upload", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { filename, content, mimeType, projectId } = req.body;
  if (!filename || !content) { res.status(400).json({ error: "filename and content required" }); return; }
  const uniqueName = `${Date.now()}-${filename}`;
  const buffer = Buffer.from(content, "base64");
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: uniqueName, Body: buffer, ContentType: mimeType || "application/octet-stream" }));
  const url = `/api/files/download/${uniqueName}`;
  const [file] = await db.insert(filesTable).values({ userId, projectId: projectId ? parseInt(projectId) : null, filename: uniqueName, originalName: filename, mimeType: mimeType || "application/octet-stream", size: buffer.length, url }).returning();
  await db.insert(activityTable).values({ userId, projectId: projectId ? parseInt(projectId) : null, type: "file_uploaded", description: `File uploaded: ${filename}` });
  res.status(201).json(formatFile(file));
});

router.get("/download/:filename", async (req, res): Promise<void> => {
  const { filename } = req.params;
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: filename }));
    const contentType = obj.ContentType || "application/octet-stream";
    if (obj.ContentLength != null) res.setHeader("Content-Length", String(obj.ContentLength));
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    const stream = obj.Body as any;
    stream.pipe(res);
  } catch (err) {
    res.status(404).json({ error: "File not found" });
  }
});

router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.userId;
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole !== "admin" && file.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: file.filename }));
  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.status(204).send();
});

function formatFile(f: typeof filesTable.$inferSelect) {
  return { id: f.id, userId: f.userId, projectId: f.projectId, filename: f.filename, originalName: f.originalName, mimeType: f.mimeType, size: f.size, url: f.url, createdAt: f.createdAt.toISOString() };
}

export default router;
