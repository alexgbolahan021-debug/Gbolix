import { Router } from "express";
import path from "path";
import fs from "fs";
import { db, filesTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET /api/files
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.json([]);
    return;
  }

  const { projectId } = req.query;
  const conditions = [eq(filesTable.userId, userId)];
  if (projectId) {
    conditions.push(eq(filesTable.projectId, parseInt(projectId as string)));
  }

  const files = await db.select().from(filesTable).where(and(...conditions));
  res.json(files.map(formatFile));
});

// POST /api/files/upload — multipart form upload
router.post("/upload", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Simple raw body approach — use busboy or multer for real file parsing
  // For now, accept JSON with base64 encoded file content
  const { filename, content, mimeType, projectId } = req.body;
  if (!filename || !content) {
    res.status(400).json({ error: "filename and content required" });
    return;
  }

  const uniqueName = `${Date.now()}-${filename}`;
  const filePath = path.join(uploadsDir, uniqueName);
  const buffer = Buffer.from(content, "base64");
  fs.writeFileSync(filePath, buffer);

  const url = `/api/files/download/${uniqueName}`;

  const [file] = await db.insert(filesTable).values({
    userId,
    projectId: projectId ? parseInt(projectId) : null,
    filename: uniqueName,
    originalName: filename,
    mimeType: mimeType || "application/octet-stream",
    size: buffer.length,
    url,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    userId,
    projectId: projectId ? parseInt(projectId) : null,
    type: "file_uploaded",
    description: `File uploaded: ${filename}`,
  });

  res.status(201).json(formatFile(file));
});

// GET /api/files/download/:filename — serve file
router.get("/download/:filename", async (req, res): Promise<void> => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.download(filePath);
});

// DELETE /api/files/:id
router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const userId = req.userId;

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (req.userRole !== "admin" && file.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Delete physical file
  const filePath = path.join(uploadsDir, file.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.status(204).send();
});

function formatFile(f: typeof filesTable.$inferSelect) {
  return {
    id: f.id,
    userId: f.userId,
    projectId: f.projectId,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    url: f.url,
    createdAt: f.createdAt.toISOString(),
  };
}

export default router;
