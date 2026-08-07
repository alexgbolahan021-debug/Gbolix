import { Router } from "express";
import { db, projectsTable, activityTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomBytes } from "crypto";

const router = Router();

function generateProjectCode(): string {
  const random = randomBytes(3).toString("hex").toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GBX-${date}-${random}`;
}

// GET /api/projects
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.json([]); return; }
  const { status, serviceType } = req.query;
  const conditions = [eq(projectsTable.userId, userId)];
  if (status && typeof status === "string") conditions.push(eq(projectsTable.status, status as any));
  if (serviceType && typeof serviceType === "string") conditions.push(eq(projectsTable.serviceType, serviceType as any));
  const projects = await db.select().from(projectsTable).where(and(...conditions)).orderBy(sql`${projectsTable.createdAt} DESC`);
  res.json(projects.map(formatProject));
});

// POST /api/projects
router.post("/", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { serviceType, title, description, requirements, priority, price } = req.body;
  if (!serviceType || !title) { res.status(400).json({ error: "serviceType and title are required" }); return; }

  const projectCode = generateProjectCode();
  const [project] = await db.insert(projectsTable).values({
    projectCode,
    userId,
    serviceType,
    title,
    description: description ?? title,
    requirements: requirements ?? null,
    priority: priority ?? "medium",
    price: price !== undefined && price !== null ? String(price) : null,
    status: "pending_review",
    hasConversation: false,
  }).returning();

  await db.insert(activityTable).values({ userId, projectId: project.id, type: "request_submitted", description: `New service request submitted: ${title}` });

  // Notify every owner so a new request is visible in the Owner Portal notification badge.
  const owners = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "owner"));
  if (owners.length) {
    await db.insert(notificationsTable).values(owners.map(owner => ({
      userId: owner.id,
      projectId: project.id,
      title: "New Service Request",
      message: `${projectCode} — ${title} is waiting for your review.`,
      type: "request_submitted",
    })));
  }

  res.status(201).json(formatProject(project));
});

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.userId;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole !== "admin" && project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(formatProject(project));
});

// PATCH /api/projects/:id
router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.userId;
  const { title, description, requirements, priority } = req.body;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole !== "admin" && project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (requirements !== undefined) updates.requirements = requirements;
  if (priority !== undefined) updates.priority = priority;
  const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
  res.json(formatProject(updated));
});

function formatProject(p: typeof projectsTable.$inferSelect) {
  return {
    id: p.id, projectCode: p.projectCode, userId: p.userId, serviceType: p.serviceType,
    title: p.title, description: p.description, requirements: p.requirements, status: p.status,
    priority: p.priority, price: p.price ? parseFloat(p.price) : null, hasConversation: p.hasConversation,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  };
}
