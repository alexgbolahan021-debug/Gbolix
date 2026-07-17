import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, projectsTable, filesTable, activityTable, messagesTable } from "@workspace/db";
import { eq, count, and, sql, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const AUTO_OWNER_EMAILS = new Set(["alexgbolahan021@gmail.com"]);

function resolveRole(email: string): "owner" | "client" {
  return AUTO_OWNER_EMAILS.has(email.toLowerCase()) ? "owner" : "client";
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    phone: user.phone,
    website: user.website,
    country: user.country,
    city: user.city,
    userType: user.userType,
    companySize: user.companySize,
    acquisitionSource: user.acquisitionSource,
    timezone: user.timezone,
    language: user.language,
    onboardingCompleted: user.onboardingCompleted,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /api/users/me
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = req.clerkId!;
  const auth = getAuth(req);

  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);

  if (user.length === 0) {
    let email = (auth?.sessionClaims?.email as string) ?? "";
    let name = (auth?.sessionClaims?.fullName as string) ?? (auth?.sessionClaims?.name as string) ?? "";
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? email;
      name = name || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;
    } catch { }
    const [created] = await db.insert(usersTable).values({
      clerkId,
      name: name || "User",
      email,
      onboardingCompleted: false,
      role: resolveRole(email),
      lastLoginAt: new Date(),
    }).returning();
    res.json(formatUser(created));
    return;
  }

  const existing = user[0];

  // Keep owner synced
  const updates: Record<string, unknown> = { lastLoginAt: new Date() };
  if (AUTO_OWNER_EMAILS.has(existing.email.toLowerCase()) && existing.role !== "owner") {
    updates.role = "owner";
  }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, existing.id)).returning();
  res.json(formatUser(updated));
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.status(404).json({ error: "User not found" }); return; }

  const { name, companyName, phone, website, country, city, timezone, language, avatarUrl } = req.body;
  const [updated] = await db.update(usersTable)
    .set({ name, companyName, phone, website, country, city, timezone, language, avatarUrl })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

// POST /api/users/me/onboarding
router.post("/me/onboarding", requireAuth, async (req, res): Promise<void> => {
  const clerkId = req.clerkId!;
  const auth = getAuth(req);
  const { userType, location, companySize, acquisitionSource } = req.body;
  let userId = req.userId;

  if (!userId) {
    const email = (auth?.sessionClaims?.email as string) ?? "";
    const name = (auth?.sessionClaims?.fullName as string) ?? (auth?.sessionClaims?.name as string) ?? email;
    const [created] = await db.insert(usersTable).values({
      clerkId, name: name || "User", email,
      userType, country: location, companySize, acquisitionSource,
      onboardingCompleted: true, role: resolveRole(email),
    }).returning();
    res.json(formatUser(created));
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ userType, country: location, companySize, acquisitionSource, onboardingCompleted: true })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(formatUser(updated));
});

// GET /api/users/me/dashboard-summary
router.get("/me/dashboard-summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.json({ activeTasks: 0, queuedTasks: 0, completedTasks: 0, openTickets: 0, filesUploaded: 0, servicesOrdered: 0, unreadMessages: 0 });
    return;
  }

  const [activeCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), sql`${projectsTable.status} IN ('in_progress', 'review')`));
  const [queuedCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), sql`${projectsTable.status} IN ('submitted', 'queued')`));
  const [completedCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.status, "completed")));
  const [filesCount] = await db.select({ count: count() }).from(filesTable)
    .where(eq(filesTable.userId, userId));
  const [totalCount] = await db.select({ count: count() }).from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  // Unread messages: messages in user's projects not sent by them, not read
  const userProjects = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.hasConversation, true)));
  let unreadMessages = 0;
  if (userProjects.length > 0) {
    const projectIds = userProjects.map(p => p.id);
    const [unreadCount] = await db.select({ count: count() }).from(messagesTable)
      .where(and(
        sql`${messagesTable.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
        eq(messagesTable.isRead, false),
        ne(messagesTable.senderId, userId),
      ));
    unreadMessages = Number(unreadCount.count);
  }

  res.json({
    activeTasks: Number(activeCount.count),
    queuedTasks: Number(queuedCount.count),
    completedTasks: Number(completedCount.count),
    openTickets: 0,
    filesUploaded: Number(filesCount.count),
    servicesOrdered: Number(totalCount.count),
    unreadMessages,
  });
});

// GET /api/users/me/recent-activity
router.get("/me/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.json([]); return; }

  const activities = await db.select({
    id: activityTable.id,
    type: activityTable.type,
    description: activityTable.description,
    createdAt: activityTable.createdAt,
    projectId: activityTable.projectId,
    projectTitle: projectsTable.title,
  })
    .from(activityTable)
    .leftJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .where(eq(activityTable.userId, userId))
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(20);

  res.json(activities.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

// GET /api/users/me/unread-count
router.get("/me/unread-count", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) { res.json({ unread: 0 }); return; }

  const userProjects = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.hasConversation, true)));

  if (userProjects.length === 0) { res.json({ unread: 0 }); return; }

  const projectIds = userProjects.map(p => p.id);
  const [unreadCount] = await db.select({ count: count() }).from(messagesTable)
    .where(and(
      sql`${messagesTable.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
      eq(messagesTable.isRead, false),
      ne(messagesTable.senderId, userId),
    ));

  res.json({ unread: Number(unreadCount.count) });
});

export default router;
