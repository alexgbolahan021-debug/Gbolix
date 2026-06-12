import { Router } from "express";
import { db, usersTable, projectsTable, filesTable, activityTable, messagesTable } from "@workspace/db";
import { eq, count, sql, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { userType, location } = req.query;

  let query = db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    userType: usersTable.userType,
    location: usersTable.country,
    companySize: usersTable.companySize,
    acquisitionSource: usersTable.acquisitionSource,
    registrationDate: usersTable.createdAt,
    role: usersTable.role,
  }).from(usersTable);

  const users = await query;

  // Get request counts
  const requestCounts = await db.select({
    userId: projectsTable.userId,
    total: count(),
  }).from(projectsTable).groupBy(projectsTable.userId);

  const countMap = new Map(requestCounts.map(r => [r.userId, Number(r.total)]));

  const filtered = users
    .filter(u => !userType || u.userType === userType)
    .filter(u => !location || u.location === location);

  res.json(filtered.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    userType: u.userType,
    location: u.location,
    companySize: u.companySize,
    acquisitionSource: u.acquisitionSource,
    registrationDate: u.registrationDate.toISOString(),
    totalRequests: countMap.get(u.id) ?? 0,
    role: u.role,
  })));
});

// GET /api/admin/projects
router.get("/projects", requireAdmin, async (req, res): Promise<void> => {
  const { status, priority } = req.query;

  const projects = await db.select({
    id: projectsTable.id,
    title: projectsTable.title,
    serviceType: projectsTable.serviceType,
    description: projectsTable.description,
    status: projectsTable.status,
    priority: projectsTable.priority,
    price: projectsTable.price,
    internalNotes: projectsTable.internalNotes,
    hasConversation: projectsTable.hasConversation,
    clientName: usersTable.name,
    clientEmail: usersTable.email,
    createdAt: projectsTable.createdAt,
    updatedAt: projectsTable.updatedAt,
  })
    .from(projectsTable)
    .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
    .orderBy(sql`${projectsTable.createdAt} DESC`);

  const filtered = projects
    .filter(p => !status || p.status === status)
    .filter(p => !priority || p.priority === priority);

  res.json(filtered.map(p => ({
    id: p.id,
    title: p.title,
    serviceType: p.serviceType,
    description: p.description,
    status: p.status,
    priority: p.priority,
    price: p.price !== null ? parseFloat(p.price) : null,
    internalNotes: p.internalNotes,
    hasConversation: p.hasConversation,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

// PATCH /api/admin/projects/:id
router.patch("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status, priority, internalNotes } = req.body;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;

  const [updated] = await db.update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, id))
    .returning();

  // Log status change activity
  if (status && status !== project.status) {
    await db.insert(activityTable).values({
      userId: project.userId,
      projectId: id,
      type: "status_change",
      description: `Project status changed to ${status}: ${project.title}`,
    });
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));

  res.json({
    id: updated.id,
    title: updated.title,
    serviceType: updated.serviceType,
    description: updated.description,
    status: updated.status,
    priority: updated.priority,
    price: updated.price !== null ? parseFloat(updated.price) : null,
    internalNotes: updated.internalNotes,
    hasConversation: updated.hasConversation,
    clientName: owner?.name ?? "",
    clientEmail: owner?.email ?? "",
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// POST /api/admin/projects/:id/start-conversation
router.post("/projects/:id/start-conversation", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [updated] = await db.update(projectsTable)
    .set({ hasConversation: true })
    .where(eq(projectsTable.id, id))
    .returning();

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));

  res.json({
    id: updated.id,
    title: updated.title,
    serviceType: updated.serviceType,
    description: updated.description,
    status: updated.status,
    priority: updated.priority,
    price: updated.price !== null ? parseFloat(updated.price) : null,
    internalNotes: updated.internalNotes,
    hasConversation: updated.hasConversation,
    clientName: owner?.name ?? "",
    clientEmail: owner?.email ?? "",
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// GET /api/admin/insights
router.get("/insights", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalClientsRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "client"));
  const [totalRequestsRow] = await db.select({ count: count() }).from(projectsTable);
  const [completedRow] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "completed"));
  const [activeRow] = await db.select({ count: count() }).from(projectsTable)
    .where(sql`${projectsTable.status} IN ('processing', 'testing', 'queued', 'backlog')`);

  // Breakdowns
  const userTypeRows = await db.select({ name: usersTable.userType, value: count() })
    .from(usersTable).where(sql`${usersTable.userType} IS NOT NULL`).groupBy(usersTable.userType);
  const locationRows = await db.select({ name: usersTable.country, value: count() })
    .from(usersTable).where(sql`${usersTable.country} IS NOT NULL`).groupBy(usersTable.country);
  const companySizeRows = await db.select({ name: usersTable.companySize, value: count() })
    .from(usersTable).where(sql`${usersTable.companySize} IS NOT NULL`).groupBy(usersTable.companySize);
  const acquisitionRows = await db.select({ name: usersTable.acquisitionSource, value: count() })
    .from(usersTable).where(sql`${usersTable.acquisitionSource} IS NOT NULL`).groupBy(usersTable.acquisitionSource);

  const toPieSlices = (rows: { name: string | null; value: number | bigint }[]) =>
    rows.map(r => ({ name: r.name ?? "Unknown", value: Number(r.value) }));

  // Generate insights summary
  const topUserType = userTypeRows.sort((a, b) => Number(b.value) - Number(a.value))[0];
  const topAcquisition = acquisitionRows.sort((a, b) => Number(b.value) - Number(a.value))[0];
  const topLocation = locationRows.sort((a, b) => Number(b.value) - Number(a.value))[0];

  const summary: string[] = [];
  if (topUserType?.name) summary.push(`Most users are ${topUserType.name}s.`);
  if (topAcquisition?.name) summary.push(`${topAcquisition.name} is the largest acquisition channel.`);
  if (topLocation?.name) summary.push(`${topLocation.name} generates the highest registrations.`);

  res.json({
    totalUsers: Number(totalUsersRow.count),
    totalClients: Number(totalClientsRow.count),
    totalRequests: Number(totalRequestsRow.count),
    completedProjects: Number(completedRow.count),
    activeProjects: Number(activeRow.count),
    openTickets: 0,
    userTypeBreakdown: toPieSlices(userTypeRows),
    locationBreakdown: toPieSlices(locationRows),
    companySizeBreakdown: toPieSlices(companySizeRows),
    acquisitionSourceBreakdown: toPieSlices(acquisitionRows),
    insightsSummary: summary,
  });
});

export default router;
