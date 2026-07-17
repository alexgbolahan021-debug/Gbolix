import { Router } from "express";
import { db, usersTable, projectsTable, filesTable, activityTable, messagesTable, notificationsTable, projectAssignmentsTable } from "@workspace/db";
import { eq, count, sql, and, inArray } from "drizzle-orm";
import { requireAdmin, requireOwner } from "../middlewares/requireAuth";

const router = Router();

function formatAdminUser(u: typeof usersTable.$inferSelect, totalRequests = 0) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    userType: u.userType,
    location: u.country,
    companySize: u.companySize,
    acquisitionSource: u.acquisitionSource,
    registrationDate: u.createdAt.toISOString(),
    totalRequests,
    role: u.role,
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
    companyName: u.companyName,
    country: u.country,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { userType, location, role } = req.query;

  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  const requestCounts = await db.select({
    userId: projectsTable.userId,
    total: count(),
  }).from(projectsTable).groupBy(projectsTable.userId);

  const countMap = new Map(requestCounts.map(r => [r.userId, Number(r.total)]));

  const filtered = users
    .filter(u => !userType || u.userType === userType)
    .filter(u => !location || u.country === location)
    .filter(u => !role || u.role === role);

  res.json(filtered.map(u => formatAdminUser(u, countMap.get(u.id) ?? 0)));
});

// GET /api/admin/users/:id
router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const [projectsCount] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.userId, id));
  const [completedCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, id), eq(projectsTable.status, "completed")));
  const [filesCount] = await db.select({ count: count() }).from(filesTable).where(eq(filesTable.userId, id));
  const [messagesCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.senderId, id));

  const recentActivity = await db.select({
    id: activityTable.id,
    type: activityTable.type,
    description: activityTable.description,
    createdAt: activityTable.createdAt,
    projectId: activityTable.projectId,
    projectTitle: projectsTable.title,
  })
    .from(activityTable)
    .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .where(eq(activityTable.userId, id))
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(10);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    website: user.website,
    companyName: user.companyName,
    userType: user.userType,
    companySize: user.companySize,
    acquisitionSource: user.acquisitionSource,
    country: user.country,
    city: user.city,
    timezone: user.timezone,
    language: user.language,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    totalProjects: Number(projectsCount.count),
    completedProjects: Number(completedCount.count),
    totalFiles: Number(filesCount.count),
    totalMessages: Number(messagesCount.count),
    recentActivity: recentActivity.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

// PATCH /api/admin/users/:id/role — owner only
router.patch("/users/:id/role", requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { role } = req.body;

  if (!["owner", "admin", "freelancer", "client"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  // Protect owner account
  if (user.role === "owner" && role !== "owner") {
    const ownerCount = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "owner"));
    if (Number(ownerCount[0].count) <= 1) {
      res.status(400).json({ error: "Cannot demote the last owner" }); return;
    }
  }

  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();

  const [projectsCountRow] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.userId, id));
  res.json(formatAdminUser(updated, Number(projectsCountRow.count)));
});

// POST /api/admin/users/:id/deactivate
router.post("/users/:id/deactivate", requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { isActive } = req.body;

  await db.update(usersTable).set({ isActive }).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

// GET /api/admin/team
router.get("/team", requireAdmin, async (req, res): Promise<void> => {
  const staff = await db.select().from(usersTable)
    .where(sql`${usersTable.role} IN ('owner', 'admin', 'freelancer')`)
    .orderBy(usersTable.createdAt);

  // Assignment counts for freelancers
  const assignments = await db.select({
    freelancerId: projectAssignmentsTable.freelancerId,
    total: count(),
  }).from(projectAssignmentsTable).groupBy(projectAssignmentsTable.freelancerId);

  const assignMap = new Map(assignments.map(a => [a.freelancerId, Number(a.total)]));

  res.json(staff.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
    assignedProjects: assignMap.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
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
    userId: projectsTable.userId,
  })
    .from(projectsTable)
    .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
    .orderBy(sql`${projectsTable.createdAt} DESC`);

  const filtered = projects
    .filter(p => !status || p.status === status)
    .filter(p => !priority || p.priority === priority);

  // Get freelancer assignments
  const projectIds = filtered.map(p => p.id);
  let assignmentMap = new Map<number, { id: number; name: string }[]>();
  if (projectIds.length > 0) {
    const assignments = await db.select({
      projectId: projectAssignmentsTable.projectId,
      freelancerId: usersTable.id,
      freelancerName: usersTable.name,
    })
      .from(projectAssignmentsTable)
      .innerJoin(usersTable, eq(projectAssignmentsTable.freelancerId, usersTable.id))
      .where(inArray(projectAssignmentsTable.projectId, projectIds));

    for (const a of assignments) {
      if (!assignmentMap.has(a.projectId)) assignmentMap.set(a.projectId, []);
      assignmentMap.get(a.projectId)!.push({ id: a.freelancerId, name: a.freelancerName });
    }
  }

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
    assignedFreelancers: assignmentMap.get(p.id) ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

// PATCH /api/admin/projects/:id
router.patch("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { status, priority, internalNotes, price } = req.body;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (internalNotes !== undefined) updates.internalNotes = internalNotes;
  if (price !== undefined) updates.price = price;

  const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();

  if (status && status !== project.status) {
    await db.insert(activityTable).values({
      userId: project.userId,
      projectId: id,
      type: "status_change",
      description: `Project status changed to ${status}: ${project.title}`,
    });
    await db.insert(notificationsTable).values({
      userId: project.userId,
      projectId: id,
      title: "Project Update",
      message: `Your project "${project.title}" status changed to ${status.replace("_", " ")}`,
      type: "status_change",
    });
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));
  const assignments = await db.select({
    freelancerId: usersTable.id,
    freelancerName: usersTable.name,
  })
    .from(projectAssignmentsTable)
    .innerJoin(usersTable, eq(projectAssignmentsTable.freelancerId, usersTable.id))
    .where(eq(projectAssignmentsTable.projectId, id));

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
    assignedFreelancers: assignments.map(a => ({ id: a.freelancerId, name: a.freelancerName })),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// POST /api/admin/projects/:id/start-conversation
router.post("/projects/:id/start-conversation", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db.update(projectsTable)
    .set({ hasConversation: true })
    .where(eq(projectsTable.id, id))
    .returning();

  await db.insert(notificationsTable).values({
    userId: project.userId,
    projectId: id,
    title: "New Conversation",
    message: `A conversation has been started on your project "${project.title}"`,
    type: "new_message",
  });

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));
  res.json({
    id: updated.id, title: updated.title, serviceType: updated.serviceType,
    description: updated.description, status: updated.status, priority: updated.priority,
    price: updated.price !== null ? parseFloat(updated.price) : null,
    internalNotes: updated.internalNotes, hasConversation: updated.hasConversation,
    clientName: owner?.name ?? "", clientEmail: owner?.email ?? "",
    assignedFreelancers: [],
    createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
  });
});

// POST /api/admin/projects/:id/assign
router.post("/projects/:id/assign", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { freelancerIds } = req.body as { freelancerIds: number[] };

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  // Replace assignments
  await db.delete(projectAssignmentsTable).where(eq(projectAssignmentsTable.projectId, id));
  if (freelancerIds && freelancerIds.length > 0) {
    await db.insert(projectAssignmentsTable).values(
      freelancerIds.map(fid => ({ projectId: id, freelancerId: fid }))
    );
  }

  res.json({ projectId: id, freelancerIds: freelancerIds ?? [] });
});

// GET /api/admin/insights
router.get("/insights", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalClientsRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "client"));
  const [totalRequestsRow] = await db.select({ count: count() }).from(projectsTable);
  const [completedRow] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.status, "completed"));
  const [activeRow] = await db.select({ count: count() }).from(projectsTable)
    .where(sql`${projectsTable.status} IN ('in_progress', 'review', 'queued', 'submitted')`);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newUsersRow] = await db.select({ count: count() }).from(usersTable)
    .where(sql`${usersTable.createdAt} >= ${oneWeekAgo}`);

  const userTypeRows = await db.select({ name: usersTable.userType, value: count() })
    .from(usersTable).where(sql`${usersTable.userType} IS NOT NULL`).groupBy(usersTable.userType);
  const locationRows = await db.select({ name: usersTable.country, value: count() })
    .from(usersTable).where(sql`${usersTable.country} IS NOT NULL`).groupBy(usersTable.country);
  const companySizeRows = await db.select({ name: usersTable.companySize, value: count() })
    .from(usersTable).where(sql`${usersTable.companySize} IS NOT NULL`).groupBy(usersTable.companySize);
  const acquisitionRows = await db.select({ name: usersTable.acquisitionSource, value: count() })
    .from(usersTable).where(sql`${usersTable.acquisitionSource} IS NOT NULL`).groupBy(usersTable.acquisitionSource);
  const serviceRows = await db.select({ name: projectsTable.serviceType, value: count() })
    .from(projectsTable).groupBy(projectsTable.serviceType);
  const statusRows = await db.select({ name: projectsTable.status, value: count() })
    .from(projectsTable).groupBy(projectsTable.status);

  const toPieSlices = (rows: { name: string | null; value: number | bigint }[]) =>
    rows.map(r => ({ name: r.name ?? "Unknown", value: Number(r.value) }));

  const totalUsers = Number(totalUsersRow.count);
  const totalWithRequests = (await db.select({ count: count() }).from(projectsTable))[0];
  const conversionRate = totalUsers > 0 ? Math.round((Number(totalWithRequests.count) / totalUsers) * 100) : 0;

  const topUserType = [...userTypeRows].sort((a, b) => Number(b.value) - Number(a.value))[0];
  const topAcquisition = [...acquisitionRows].sort((a, b) => Number(b.value) - Number(a.value))[0];
  const topLocation = [...locationRows].sort((a, b) => Number(b.value) - Number(a.value))[0];
  const summary: string[] = [];
  if (topUserType?.name) summary.push(`Most users are ${topUserType.name}s.`);
  if (topAcquisition?.name) summary.push(`${topAcquisition.name} is the top acquisition channel.`);
  if (topLocation?.name) summary.push(`${topLocation.name} has the highest user registrations.`);

  res.json({
    totalUsers,
    totalClients: Number(totalClientsRow.count),
    totalRequests: Number(totalRequestsRow.count),
    completedProjects: Number(completedRow.count),
    activeProjects: Number(activeRow.count),
    openTickets: 0,
    newUsersThisWeek: Number(newUsersRow.count),
    conversionRate,
    userTypeBreakdown: toPieSlices(userTypeRows),
    locationBreakdown: toPieSlices(locationRows),
    companySizeBreakdown: toPieSlices(companySizeRows),
    acquisitionSourceBreakdown: toPieSlices(acquisitionRows),
    serviceRequestBreakdown: toPieSlices(serviceRows),
    statusBreakdown: toPieSlices(statusRows),
    insightsSummary: summary,
  });
});

export default router;
