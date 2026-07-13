import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, projectsTable, filesTable, activityTable } from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Accounts that are automatically granted the admin role on first sign-in
const AUTO_ADMIN_EMAILS = new Set(["alexgbolahan021@gmail.com"]);

function resolveRole(email: string): "admin" | "client" {
  return AUTO_ADMIN_EMAILS.has(email.toLowerCase()) ? "admin" : "client";
}

// GET /api/users/me — get or JIT-create current user profile
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = req.clerkId!;
  const auth = getAuth(req);

  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);

  if (user.length === 0) {
    // JIT provision — use Clerk Backend API for reliable email (session claims don't include it by default)
    let email = (auth?.sessionClaims?.email as string) ?? "";
    let name = (auth?.sessionClaims?.fullName as string) ?? (auth?.sessionClaims?.name as string) ?? "";
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? email;
      name = name || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;
    } catch {
      // fallback to session claims already set above
    }
    const [created] = await db.insert(usersTable).values({
      clerkId,
      name: name || "User",
      email,
      onboardingCompleted: false,
      role: resolveRole(email),
    }).returning();
    res.json(formatUser(created));
    return;
  }

  const existing = user[0];
  // Sync role: if email is in AUTO_ADMIN_EMAILS but stored role is wrong, fix it
  const correctRole = resolveRole(existing.email);
  if (existing.role !== correctRole) {
    const [updated] = await db.update(usersTable)
      .set({ role: correctRole })
      .where(eq(usersTable.id, existing.id))
      .returning();
    res.json(formatUser(updated));
    return;
  }

  res.json(formatUser(existing));
});

// PATCH /api/users/me — update profile
router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const { name, companyName, phone, country } = req.body;
  const userId = req.userId;
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ name, companyName, phone, country })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

// POST /api/users/me/onboarding — complete onboarding
router.post("/me/onboarding", requireAuth, async (req, res): Promise<void> => {
  const clerkId = req.clerkId!;
  const auth = getAuth(req);
  const { userType, location, companySize, acquisitionSource } = req.body;

  let userId = req.userId;

  // If user doesn't exist yet, create them
  if (!userId) {
    const email = (auth?.sessionClaims?.email as string) ?? "";
    const name = (auth?.sessionClaims?.fullName as string) ?? (auth?.sessionClaims?.name as string) ?? email;
    const [created] = await db.insert(usersTable).values({
      clerkId,
      name: name || "User",
      email,
      userType,
      country: location,
      companySize,
      acquisitionSource,
      onboardingCompleted: true,
      role: resolveRole(email),
    }).returning();
    res.json(formatUser(created));
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({
      userType,
      country: location,
      companySize,
      acquisitionSource,
      onboardingCompleted: true,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

// GET /api/users/me/dashboard-summary
router.get("/me/dashboard-summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.json({ activeTasks: 0, queuedTasks: 0, completedTasks: 0, openTickets: 0, filesUploaded: 0, servicesOrdered: 0 });
    return;
  }

  const [activeCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), sql`${projectsTable.status} IN ('processing', 'testing')`));
  const [queuedCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.status, "queued")));
  const [completedCount] = await db.select({ count: count() }).from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.status, "completed")));
  const [filesCount] = await db.select({ count: count() }).from(filesTable)
    .where(eq(filesTable.userId, userId));
  const [totalCount] = await db.select({ count: count() }).from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  res.json({
    activeTasks: Number(activeCount.count),
    queuedTasks: Number(queuedCount.count),
    completedTasks: Number(completedCount.count),
    openTickets: 0,
    filesUploaded: Number(filesCount.count),
    servicesOrdered: Number(totalCount.count),
  });
});

// GET /api/users/me/recent-activity
router.get("/me/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.json([]);
    return;
  }

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

  res.json(activities);
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    phone: user.phone,
    country: user.country,
    userType: user.userType,
    companySize: user.companySize,
    acquisitionSource: user.acquisitionSource,
    onboardingCompleted: user.onboardingCompleted,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export default router;
