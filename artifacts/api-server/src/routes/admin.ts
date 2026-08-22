import { Router } from "express";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  projectsTable,
  filesTable,
  activityTable,
  messagesTable,
  notificationsTable,
  projectAssignmentsTable,
  paymentsTable,
  workspaceMembershipsTable,
  creditAccountsTable,
  creditLedgerEntriesTable,
  productOrdersTable,
} from "@workspace/db";
import { eq, count, sql, and, inArray, desc } from "drizzle-orm";
import { requireAdmin, requireOwner } from "../middlewares/requireAuth";
import { normalizeRole } from "../lib/roles";
import { ensureWorkspaceWallet } from "../lib/walletService";

const router = Router();

const NEED_INFO_MESSAGE =
  "We have reviewed your request. We need some additional information before we can proceed. Please check your request conversation; our team will send the required details there shortly.";

function moneyTotal(rows: Array<{ amount: string | number; currency: string }>) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount || 0));
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
}

router.get("/credits", requireAdmin, async (req, res): Promise<void> => {
  const query = String(req.query.search ?? "").trim().toLowerCase();
  const customers = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    workspaceId: workspaceMembershipsTable.workspaceId,
    availableCredits: creditAccountsTable.availableCredits,
    reservedCredits: creditAccountsTable.reservedCredits,
  }).from(usersTable)
    .leftJoin(workspaceMembershipsTable, eq(workspaceMembershipsTable.userId, usersTable.id))
    .leftJoin(creditAccountsTable, eq(creditAccountsTable.workspaceId, workspaceMembershipsTable.workspaceId))
    .where(eq(usersTable.role, "client"))
    .orderBy(usersTable.createdAt);

  const filtered = customers.filter(customer => !query || [customer.name, customer.email].filter(Boolean).some(value => String(value).toLowerCase().includes(query)));
  const customerIds = filtered.map(customer => customer.id);
  const orders = customerIds.length ? await db.select().from(productOrdersTable).where(inArray(productOrdersTable.purchasedByUserId, customerIds)).orderBy(desc(productOrdersTable.createdAt)) : [];
  const workspaceIds = filtered.map(customer => customer.workspaceId).filter((id): id is number => id !== null);
  const ledger = workspaceIds.length ? await db.select().from(creditLedgerEntriesTable).where(inArray(creditLedgerEntriesTable.workspaceId, workspaceIds)).orderBy(desc(creditLedgerEntriesTable.createdAt)) : [];

  res.json(filtered.map(customer => {
    const customerOrders = orders.filter(order => order.purchasedByUserId === customer.id);
    const customerLedger = customer.workspaceId === null ? [] : ledger.filter(entry => entry.workspaceId === customer.workspaceId);
    const successfulOrders = customerOrders.filter(order => order.status === "paid");
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      availableCredits: customer.availableCredits ?? 0,
      reservedCredits: customer.reservedCredits ?? 0,
      totalCredits: (customer.availableCredits ?? 0) + (customer.reservedCredits ?? 0),
      totalCreditsPurchased: successfulOrders.reduce((total, order) => total + order.credits, 0),
      totalCreditValue: moneyTotal(successfulOrders),
      purchaseCount: successfulOrders.length,
      history: customerLedger.slice(0, 100).map(entry => ({ id: entry.id, type: entry.entryType, credits: entry.credits, sourceType: entry.sourceType, sourceKey: entry.sourceKey, metadata: entry.metadata, createdAt: entry.createdAt.toISOString() })),
      purchases: customerOrders.slice(0, 100).map(order => ({ id: order.id, orderKey: order.orderKey, credits: order.credits, amount: Number(order.amount), currency: order.currency, status: order.status, createdAt: order.createdAt.toISOString(), paidAt: order.paidAt?.toISOString() ?? null })),
    };
  }));
});

router.post("/credits/:userId/adjust", requireAdmin, async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  const credits = Number(req.body?.credits);
  const reason = String(req.body?.reason ?? "").trim();
  if (!Number.isInteger(userId) || !Number.isInteger(credits) || credits <= 0 || !reason) {
    res.status(400).json({ error: "A positive whole-credit amount and reason are required" });
    return;
  }
  const [customer] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.role, "client"))).limit(1);
  if (!customer) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const context = await ensureWorkspaceWallet(customer.id, customer.name ?? undefined);
  const adjustmentKey = `admin_adjustment:${crypto.randomUUID()}`;
  const result = await db.transaction(async tx => {
    const [account] = await tx.select().from(creditAccountsTable).where(eq(creditAccountsTable.id, context.account.id)).limit(1);
    if (!account) throw new Error("Wallet account not found");
    const [updated] = await tx.update(creditAccountsTable).set({ availableCredits: account.availableCredits + credits, version: account.version + 1, updatedAt: new Date() }).where(and(eq(creditAccountsTable.id, account.id), eq(creditAccountsTable.version, account.version))).returning();
    if (!updated) throw Object.assign(new Error("Wallet changed while applying the adjustment"), { statusCode: 409 });
    await tx.insert(creditLedgerEntriesTable).values({ accountId: account.id, workspaceId: context.workspace.id, productId: context.product.id, entryType: "adjustment", credits, idempotencyKey: adjustmentKey, sourceType: "admin_manual_adjustment", sourceKey: adjustmentKey, metadata: { adminUserId: req.userId, reason, previousAvailableCredits: account.availableCredits, newAvailableCredits: updated.availableCredits } });
    return updated;
  });

  await db.insert(activityTable).values({ userId: customer.id, type: "payment", description: `Admin #${req.userId} credit adjustment: +${credits} credits (${reason})` });
  res.status(201).json({ ok: true, adjustmentKey, availableCredits: result.availableCredits, reservedCredits: result.reservedCredits });
});

function formatAdminUser(
  u: typeof usersTable.$inferSelect,
  totalRequests = 0,
) {
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
    role: normalizeRole(u.role),
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
    companyName: u.companyName,
    country: u.country,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  };
}

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { userType, location, role } = req.query;

  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  const requestCounts = await db
    .select({
      userId: projectsTable.userId,
      total: count(),
    })
    .from(projectsTable)
    .groupBy(projectsTable.userId);

  const countMap = new Map(
    requestCounts.map((r) => [r.userId, Number(r.total)]),
  );

  const filtered = users
    .filter((u) => !userType || u.userType === userType)
    .filter((u) => !location || u.country === location)
    .filter((u) => !role || u.role === role);

  res.json(filtered.map((u) => formatAdminUser(u, countMap.get(u.id) ?? 0)));
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [projectsCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, id));

  const [completedCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.userId, id),
        eq(projectsTable.status, "completed"),
      ),
    );

  const [filesCount] = await db
    .select({ count: count() })
    .from(filesTable)
    .where(eq(filesTable.userId, id));

  const [messagesCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(eq(messagesTable.senderId, id));

  const recentActivity = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      description: activityTable.description,
      createdAt: activityTable.createdAt,
      projectId: activityTable.projectId,
      projectTitle: projectsTable.title,
    })
    .from(activityTable)
    .leftJoin(
      projectsTable,
      eq(activityTable.projectId, projectsTable.id),
    )
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
    role: normalizeRole(user.role),
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt
      ? user.lastLoginAt.toISOString()
      : null,
    totalProjects: Number(projectsCount.count),
    completedProjects: Number(completedCount.count),
    totalFiles: Number(filesCount.count),
    totalMessages: Number(messagesCount.count),
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

router.patch("/users/:id/role", requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { role } = req.body;
  const requestedRole = role === "freelancer" ? "specialist" : role;

  if (!["owner", "admin", "specialist", "client"].includes(requestedRole)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (user.role === "owner" && requestedRole !== "owner") {
    const ownerCount = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "owner"));

    if (Number(ownerCount[0].count) <= 1) {
      res.status(400).json({ error: "Cannot demote the last owner" });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: requestedRole })
    .where(eq(usersTable.id, id))
    .returning();

  const [projectsCountRow] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, id));

  res.json(formatAdminUser(updated, Number(projectsCountRow.count)));
});

router.post("/users/:id/deactivate", requireOwner, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { isActive } = req.body;

  await db
    .update(usersTable)
    .set({ isActive })
    .where(eq(usersTable.id, id));

  res.json({ ok: true });
});

router.get("/team", requireAdmin, async (req, res): Promise<void> => {
  const staff = await db
    .select()
    .from(usersTable)
    .where(sql`${usersTable.role} IN ('owner', 'admin', 'specialist', 'freelancer')`)
    .orderBy(usersTable.createdAt);

  const assignments = await db
    .select({
      freelancerId: projectAssignmentsTable.freelancerId,
      total: count(),
    })
    .from(projectAssignmentsTable)
    .groupBy(projectAssignmentsTable.freelancerId);

  const assignMap = new Map(
    assignments.map((a) => [a.freelancerId, Number(a.total)]),
  );

  res.json(
    staff.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: normalizeRole(u.role),
      isActive: u.isActive,
      avatarUrl: u.avatarUrl,
      assignedProjects: assignMap.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt
        ? u.lastLoginAt.toISOString()
        : null,
    })),
  );
});

router.get("/projects", requireAdmin, async (req, res): Promise<void> => {
  const { status, priority } = req.query;

  const projects = await db
    .select({
      id: projectsTable.id,
      projectCode: projectsTable.projectCode,
      title: projectsTable.title,
      serviceType: projectsTable.serviceType,
      description: projectsTable.description,
      requirements: projectsTable.requirements,
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
    .filter((p) => !status || p.status === status)
    .filter((p) => !priority || p.priority === priority);

  const projectIds = filtered.map((p) => p.id);

  let assignmentMap = new Map<
    number,
    { id: number; name: string }[]
  >();

  if (projectIds.length > 0) {
    const assignments = await db
      .select({
        projectId: projectAssignmentsTable.projectId,
        freelancerId: usersTable.id,
        freelancerName: usersTable.name,
      })
      .from(projectAssignmentsTable)
      .innerJoin(
        usersTable,
        eq(projectAssignmentsTable.freelancerId, usersTable.id),
      )
      .where(inArray(projectAssignmentsTable.projectId, projectIds));

    for (const a of assignments) {
      if (!assignmentMap.has(a.projectId)) {
        assignmentMap.set(a.projectId, []);
      }

      assignmentMap.get(a.projectId)!.push({
        id: a.freelancerId,
        name: a.freelancerName,
      });
    }
  }

  // Payment status is read separately from the project status.
  const paymentRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: paymentsTable.projectId,
            status: paymentsTable.status,
          })
          .from(paymentsTable)
          .where(inArray(paymentsTable.projectId, projectIds))
          .orderBy(desc(paymentsTable.createdAt))
      : [];

  const paymentMap = new Map<number, string>();

  for (const payment of paymentRows) {
    if (!paymentMap.has(payment.projectId)) {
      paymentMap.set(payment.projectId, payment.status);
    }
  }

  res.json(
    filtered.map((p) => ({
      id: p.id,
      projectCode: p.projectCode,
      title: p.title,
      serviceType: p.serviceType,
      description: p.description,
      requirements: p.requirements,

      // Request/project status.
      status: p.status,

      // Payment status is intentionally separate.
      paymentStatus: paymentMap.get(p.id) ?? null,

      priority: p.priority,
      price: p.price !== null ? parseFloat(p.price) : null,
      internalNotes: p.internalNotes,
      hasConversation: p.hasConversation,
      clientName: p.clientName,
      clientEmail: p.clientEmail,
      assignedFreelancers: assignmentMap.get(p.id) ?? [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
});

router.get("/projects/:id/activity", requireAdmin, async (req, res): Promise<void> => {
  const id = Number.parseInt(req.params.id as string, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const rows = await db.select({ id: activityTable.id, type: activityTable.type, description: activityTable.description, createdAt: activityTable.createdAt })
    .from(activityTable)
    .where(eq(activityTable.projectId, id))
    .orderBy(desc(activityTable.createdAt))
    .limit(100);
  res.json(rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })));
});

/**
 * Manually override the latest payment record from the Admin Portal.
 *
 * IMPORTANT:
 * This is separate from the project/request lifecycle status. A reason,
 * admin attribution, audit entry, and client notification are always required.
 */
router.patch("/projects/:id/payment-status", requireAdmin, async (req, res): Promise<void> => {
  const id = Number.parseInt(req.params.id as string, 10);
  const { status, reason } = req.body ?? {};
  const allowedStatuses = ["pending", "paid", "failed", "cancelled"] as const;
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid project id" }); return; }
  if (!allowedStatuses.includes(status)) { res.status(400).json({ error: "Invalid payment status" }); return; }
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  if (!normalizedReason) { res.status(400).json({ error: "A reason is required for manual payment-status changes" }); return; }
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const [payment] = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.projectId, id))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(1);
  if (!payment) { res.status(404).json({ error: "No payment record exists for this project" }); return; }
  if (payment.status === status) {
    res.json({ projectId: id, paymentId: payment.id, paymentStatus: payment.status, changed: false });
    return;
  }

  const [updatedPayment] = await db.update(paymentsTable)
    .set({
      status,
      paidAt: status === "paid" ? new Date() : null,
      markedPaidByAdminId: status === "paid" ? req.userId : null,
    })
    .where(eq(paymentsTable.id, payment.id))
    .returning();

  await db.insert(activityTable).values({
    userId: project.userId,
    projectId: id,
    type: "payment",
    description: `Admin #${req.userId} manually changed payment status from ${payment.status} to ${status} for ${project.title}. Reason: ${normalizedReason}`,
  });
  await db.insert(notificationsTable).values({
    userId: project.userId,
    projectId: id,
    title: "Payment Update",
    message: `Payment status for your project "${project.title}" was changed to ${status.replace("_", " ")}.`,
    type: "payment",
  });
  res.json({ projectId: id, paymentId: updatedPayment.id, paymentStatus: updatedPayment.status, changed: true });
});
router.patch("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const {
    status,
    priority,
    internalNotes,
    price,
    paymentStatus,
    reason,
  } = req.body;

  // Payment status is changed only through the dedicated, audited
  // payment-status endpoint above.
  if (paymentStatus !== undefined) {
    res.status(400).json({
      error:
        "Payment status is managed by the payment flow and cannot be changed here",
    });
    return;
  }

  // These are payment states, not project/request states.
  // They must never be written into projectsTable.status.
  if (status === "payment_pending" || status === "paid") {
    res.status(400).json({
      error:
        "Payment status cannot be used as a project status",
    });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    updates.status = status;
  }

  if (priority !== undefined) {
    updates.priority = priority;
  }

  if (internalNotes !== undefined) {
    updates.internalNotes = internalNotes;
  }

  if (price !== undefined) {
    updates.price = price;
  }

  const [updated] = await db
    .update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, id))
    .returning();

  if (status && status !== project.status) {
    await db.insert(activityTable).values({
      userId: project.userId,
      projectId: id,
      type: "status_change",
      description: `Admin #${req.userId ?? "unknown"} changed project status from ${project.status} to ${status}${reason ? ` — Reason: ${String(reason).trim()}` : ""}: ${project.title}`,
    });

    await db.insert(notificationsTable).values({
      userId: project.userId,
      projectId: id,
      title: "Project Update",
      message: `Your project "${project.title}" status changed to ${status.replace("_", " ")}`,
      type: "status_change",
    });
  }

  res.json(updated);
});

router.post("/projects/:id/review", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const { action, reason } = req.body;

  if (!["approve", "request_info", "decline"].includes(action)) {
    res.status(400).json({ error: "Invalid review action" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const status =
    action === "approve"
      ? "approved"
      : action === "request_info"
        ? "needs_info"
        : "declined";

  const message =
    action === "approve"
      ? "Great news! We have reviewed your request and we are ready to proceed with your project."
      : action === "request_info"
        ? NEED_INFO_MESSAGE
        : "We have reviewed your request and are unable to proceed with it at this time. You can submit a new request if you would like us to review a revised project request.";

  const alreadyHandled = project.status !== "pending_review";

  if (alreadyHandled) {
    res.status(400).json({
      error: `This request is already ${project.status.replace("_", " ")}`,
    });
    return;
  }

  const shouldOpenConversation = action !== "decline";

  await db
    .update(projectsTable)
    .set({
      status,
      hasConversation: shouldOpenConversation,
    })
    .where(eq(projectsTable.id, id));

  const senderId = req.userId;

  if (!senderId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      projectId: id,
      senderId,
      content: message,
      isRead: false,
    })
    .returning();

  await db.insert(activityTable).values({
    userId: project.userId,
    projectId: id,
    type: "admin_response",
    description: `Admin #${req.userId ?? "unknown"} changed request status from ${project.status} to ${status}${reason ? ` — Reason: ${String(reason).trim()}` : ""}: ${project.title}`,
  });

  await db.insert(notificationsTable).values({
    userId: project.userId,
    projectId: id,
    title:
      action === "approve"
        ? "Request Approved"
        : action === "request_info"
          ? "More Information Needed"
          : "Request Declined",
    message: message.split("\n")[0],
    type:
      action === "request_info"
        ? "new_message"
        : "status_change",
  });

  res.json({
    ok: true,
    status,
    hasConversation: shouldOpenConversation,
    messageId: msg.id,
  });
});

router.post("/projects/:id/start-conversation", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (project.hasConversation) {
    res.json({ ok: true });
    return;
  }

  await db
    .update(projectsTable)
    .set({ hasConversation: true })
    .where(eq(projectsTable.id, id));

  await db.insert(notificationsTable).values({
    userId: project.userId,
    projectId: id,
    title: "Conversation Started",
    message: `A conversation has been started for your project "${project.title}"`,
    type: "message",
  });

  res.json({ ok: true });
});

export default router;
