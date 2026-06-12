import { Router } from "express";
import { db, projectsTable, usersTable, activityTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/projects
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.json([]);
    return;
  }

  const { status, serviceType } = req.query;
  const conditions = [eq(projectsTable.userId, userId)];
  if (status && typeof status === "string") {
    conditions.push(eq(projectsTable.status, status as any));
  }
  if (serviceType && typeof serviceType === "string") {
    conditions.push(eq(projectsTable.serviceType, serviceType));
  }

  const projects = await db.select().from(projectsTable)
    .where(and(...conditions))
    .orderBy(sql`${projectsTable.createdAt} DESC`);

  res.json(projects.map(formatProject));
});

// POST /api/projects
router.post("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { serviceType, title, description, priority, price } = req.body;

  const [project] = await db.insert(projectsTable).values({
    userId,
    serviceType,
    title,
    description,
    priority: priority ?? "medium",
    price: price ? String(price) : null,
    status: "backlog",
    hasConversation: false,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    userId,
    projectId: project.id,
    type: "request_submitted",
    description: `New service request submitted: ${title}`,
  });

  res.status(201).json(formatProject(project));
});

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const userId = req.userId;

  const [project] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Allow admin or owner
  if (req.userRole !== "admin" && project.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(formatProject(project));
});

// PATCH /api/projects/:id
router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const userId = req.userId;
  const { title, description, priority } = req.body;

  const [project] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (req.userRole !== "admin" && project.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (priority !== undefined) updates.priority = priority;

  const [updated] = await db.update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, id))
    .returning();

  res.json(formatProject(updated));
});

function formatProject(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    serviceType: p.serviceType,
    title: p.title,
    description: p.description,
    status: p.status,
    priority: p.priority,
    price: p.price !== null ? parseFloat(p.price) : null,
    hasConversation: p.hasConversation,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
