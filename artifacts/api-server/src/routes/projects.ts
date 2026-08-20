import { Router } from "express";
import { db, projectsTable, activityTable, usersTable, notificationsTable, paymentsTable, messagesTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomBytes } from "crypto";

const router = Router();

function generateProjectCode(): string {
  const random = randomBytes(3).toString("hex").toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GBX-${date}-${random}`;
}

async function getPaymentStatus(projectId: number) {
  const [payment] = await db
    .select({ status: paymentsTable.status })
    .from(paymentsTable)
    .where(eq(paymentsTable.projectId, projectId));

  return payment?.status ?? null;
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
  const projectIds = projects.map(project => project.id);

  const messageRows = projectIds.length
    ? await db
        .select({
          projectId: messagesTable.projectId,
          senderId: messagesTable.senderId,
          content: messagesTable.content,
          fileName: messagesTable.fileName,
          isRead: messagesTable.isRead,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .where(inArray(messagesTable.projectId, projectIds))
        .orderBy(sql`${messagesTable.createdAt} DESC`)
    : [];

  const messageMeta = new Map<number, {
    latestMessageAt: Date | null;
    latestMessagePreview: string;
    unreadMessageCount: number;
  }>();

  for (const row of messageRows) {
    const current = messageMeta.get(row.projectId) ?? {
      latestMessageAt: null,
      latestMessagePreview: "",
      unreadMessageCount: 0,
    };

    if (!current.latestMessageAt) {
      current.latestMessageAt = row.createdAt;
      current.latestMessagePreview = row.content?.trim() || (row.fileName ? `📎 ${row.fileName}` : "New message");
    }

    if (!row.isRead && row.senderId !== userId) {
      current.unreadMessageCount += 1;
    }

    messageMeta.set(row.projectId, current);
  }

  const formatted = await Promise.all(projects.map(formatProject));
  res.json(formatted.map(project => {
    const meta = messageMeta.get(project.id);
    return {
      ...project,
      latestMessageAt: meta?.latestMessageAt?.toISOString() ?? null,
      latestMessagePreview: meta?.latestMessagePreview ?? "",
      unreadMessageCount: meta?.unreadMessageCount ?? 0,
    };
  }));
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

  const owners = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "owner"));
  if (owners.length) {
    await db.insert(notificationsTable).values(owners.map(owner => ({
      userId: owner.id,
      projectId: project.id,
      title: "New Service Request",
      message: `${projectCode} — ${title} is waiting for your review.`,
      type: "request_submitted" as const,
    })));
  }

  res.status(201).json(await formatProject(project));
});

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.userId;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole !== "admin" && project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(await formatProject(project));
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
  res.json(await formatProject(updated));
});

async function formatProject(p: typeof projectsTable.$inferSelect) {
  const paymentStatus = await getPaymentStatus(p.id);

  return {
    id: p.id,
    projectCode: p.projectCode,
    userId: p.userId,
    serviceType: p.serviceType,
    title: p.title,
    description: p.description,
    requirements: p.requirements,
    status: p.status,
    paymentStatus,
    priority: p.priority,
    price: p.price ? parseFloat(p.price) : null,
    hasConversation: p.hasConversation,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
