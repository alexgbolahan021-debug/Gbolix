import { Router } from "express";
import { db, usersTable, projectsTable, filesTable, activityTable, messagesTable, notificationsTable, projectAssignmentsTable } from "@workspace/db";
import { eq, count, sql, and, inArray } from "drizzle-orm";
import { requireAdmin, requireOwner } from "../middlewares/requireAuth";

const router = Router();

function formatAdminUser(u: typeof usersTable.$inferSelect, totalRequests = 0) {
  return { id: u.id, name: u.name, email: u.email, userType: u.userType, location: u.country, companySize: u.companySize, acquisitionSource: u.acquisitionSource, registrationDate: u.createdAt.toISOString(), totalRequests, role: u.role, isActive: u.isActive, avatarUrl: u.avatarUrl, companyName: u.companyName, country: u.country, lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null };
}

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { userType, location, role } = req.query;
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const requestCounts = await db.select({ userId: projectsTable.userId, total: count() }).from(projectsTable).groupBy(projectsTable.userId);
  const countMap = new Map(requestCounts.map(r => [r.userId, Number(r.total)]));
  const filtered = users.filter(u => !userType || u.userType === userType).filter(u => !location || u.country === location).filter(u => !role || u.role === role);
  res.json(filtered.map(u => formatAdminUser(u, countMap.get(u.id) ?? 0)));
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string); const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const [projectsCount] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.userId, id));
  const [completedCount] = await db.select({ count: count() }).from(projectsTable).where(and(eq(projectsTable.userId, id), eq(projectsTable.status, "completed")));
  const [filesCount] = await db.select({ count: count() }).from(filesTable).where(eq(filesTable.userId, id));
  const [messagesCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.senderId, id));
  const recentActivity = await db.select({ id: activityTable.id, type: activityTable.type, description: activityTable.description, createdAt: activityTable.createdAt, projectId: activityTable.projectId, projectTitle: projectsTable.title }).from(activityTable).leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id)).where(eq(activityTable.userId, id)).orderBy(sql`${activityTable.createdAt} DESC`).limit(10);
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, website: user.website, companyName: user.companyName, userType: user.userType, companySize: user.companySize, acquisitionSource: user.acquisitionSource, country: user.country, city: user.city, timezone: user.timezone, language: user.language, role: user.role, isActive: user.isActive, avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString(), lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null, totalProjects: Number(projectsCount.count), completedProjects: Number(completedCount.count), totalFiles: Number(filesCount.count), totalMessages: Number(messagesCount.count), recentActivity: recentActivity.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })) });
});

router.patch("/users/:id/role", requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string); const { role } = req.body;
  if (!["owner", "admin", "freelancer", "client"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)); if (!user) { res.status(404).json({ error: "Not found" }); return; }
  if (user.role === "owner" && role !== "owner") { const ownerCount = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "owner")); if (Number(ownerCount[0].count) <= 1) { res.status(400).json({ error: "Cannot demote the last owner" }); return; } }
  const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, id)).returning();
  const [projectsCountRow] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.userId, id)); res.json(formatAdminUser(updated, Number(projectsCountRow.count)));
});

router.post("/users/:id/deactivate", requireOwner, async (req, res): Promise<void> => { const id = parseInt(req.params.id as string); const { isActive } = req.body; await db.update(usersTable).set({ isActive }).where(eq(usersTable.id, id)); res.json({ ok: true }); });

router.get("/team", requireAdmin, async (req, res): Promise<void> => {
  const staff = await db.select().from(usersTable).where(sql`${usersTable.role} IN ('owner', 'admin', 'freelancer')`).orderBy(usersTable.createdAt);
  const assignments = await db.select({ freelancerId: projectAssignmentsTable.freelancerId, total: count() }).from(projectAssignmentsTable).groupBy(projectAssignmentsTable.freelancerId); const assignMap = new Map(assignments.map(a => [a.freelancerId, Number(a.total)]));
  res.json(staff.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, avatarUrl: u.avatarUrl, assignedProjects: assignMap.get(u.id) ?? 0, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null })));
});

router.get("/projects", requireAdmin, async (req, res): Promise<void> => {
  const { status, priority } = req.query;
  const projects = await db.select({ id: projectsTable.id, projectCode: projectsTable.projectCode, title: projectsTable.title, serviceType: projectsTable.serviceType, description: projectsTable.description, requirements: projectsTable.requirements, status: projectsTable.status, priority: projectsTable.priority, price: projectsTable.price, internalNotes: projectsTable.internalNotes, hasConversation: projectsTable.hasConversation, clientName: usersTable.name, clientEmail: usersTable.email, createdAt: projectsTable.createdAt, updatedAt: projectsTable.updatedAt, userId: projectsTable.userId }).from(projectsTable).innerJoin(usersTable, eq(projectsTable.userId, usersTable.id)).orderBy(sql`${projectsTable.createdAt} DESC`);
  const filtered = projects.filter(p => !status || p.status === status).filter(p => !priority || p.priority === priority); const projectIds = filtered.map(p => p.id); let assignmentMap = new Map<number, { id: number; name: string }[]>();
  if (projectIds.length > 0) { const assignments = await db.select({ projectId: projectAssignmentsTable.projectId, freelancerId: usersTable.id, freelancerName: usersTable.name }).from(projectAssignmentsTable).innerJoin(usersTable, eq(projectAssignmentsTable.freelancerId, usersTable.id)).where(inArray(projectAssignmentsTable.projectId, projectIds)); for (const a of assignments) { if (!assignmentMap.has(a.projectId)) assignmentMap.set(a.projectId, []); assignmentMap.get(a.projectId)!.push({ id: a.freelancerId, name: a.freelancerName }); } }
  res.json(filtered.map(p => ({ id: p.id, projectCode: p.projectCode, title: p.title, serviceType: p.serviceType, description: p.description, requirements: p.requirements, status: p.status, priority: p.priority, price: p.price !== null ? parseFloat(p.price) : null, internalNotes: p.internalNotes, hasConversation: p.hasConversation, clientName: p.clientName, clientEmail: p.clientEmail, assignedFreelancers: assignmentMap.get(p.id) ?? [], createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
});

router.patch("/projects/:id", requireAdmin, async (req, res): Promise<void> => { const id = parseInt(req.params.id as string); const { status, priority, internalNotes, price } = req.body;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)); if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const updates: Record<string, unknown> = {}; if (status !== undefined) updates.status = status; if (priority !== undefined) updates.priority = priority; if (internalNotes !== undefined) updates.internalNotes = internalNotes; if (price !== undefined) updates.price = price;
  const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
  if (status && status !== project.status) { await db.insert(activityTable).values({ userId: project.userId, projectId: id, type: "status_change", description: `Project status changed to ${status}: ${project.title}` }); await db.insert(notificationsTable).values({ userId: project.userId, projectId: id, title: "Project Update", message: `Your project \"${project.title}\" status changed to ${status.replace("_", " ")}`, type: "status_change" }); }
  res.json(updated);
});

router.post("/projects/:id/review", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string); const { action } = req.body;
  if (!["approve", "request_info", "decline"].includes(action)) { res.status(400).json({ error: "Invalid review action" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const status = action === "approve" ? "approved" : action === "request_info" ? "needs_info" : "declined";
  const message = action === "approve"
    ? "Great news! We have reviewed your request and we are ready to proceed with your project."
    : action === "request_info"
      ? "We have reviewed your request. We need some additional information before we can proceed. Please check your request conversation; our team will send the required details there shortly."
      : "We have reviewed your request and are unable to proceed with it at this time. You can submit a new request if you would like us to review a revised project request.";
  const alreadyHandled = project.status !== "pending_review";
  if (alreadyHandled) { res.status(400).json({ error: `This request is already ${project.status.replace("_", " ")}` }); return; }
  const shouldOpenConversation = action !== "decline";
  await db.update(projectsTable).set({ status, hasConversation: shouldOpenConversation }).where(eq(projectsTable.id, id));
  const senderId = req.userId;
  if (!senderId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [msg] = await db.insert(messagesTable).values({ projectId: id, senderId, content: message, isRead: false }).returning();
  await db.insert(activityTable).values({ userId: project.userId, projectId: id, type: "admin_response", description: `Request ${status}: ${project.title}` });
  await db.insert(notificationsTable).values({ userId: project.userId, projectId: id, title: action === "approve" ? "Request Approved" : action === "request_info" ? "More Information Needed" : "Request Declined", message: message.split("\n")[0], type: action === "request_info" ? "new_message" : "status_change" });
  res.json({ ok: true, status, hasConversation: shouldOpenConversation, messageId: msg.id });
});

router.post("/projects/:id/start-conversation", requireAdmin, async (req, res): Promise<void> => { const id = parseInt(req.params.id as string); const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  if (project.hasConversation) { res.json({ ok: true }); return; }
  await db.update(projectsTable).set({ hasConversation: true }).where(eq(projectsTable.id, id)); await db.insert(notificationsTable).values({ userId: project.userId, projectId: id, title: "Conversation Started", message: `A conversation has been started for your project \"${project.title}\"`, type: "message" }); res.json({ ok: true });
});

export default router;
