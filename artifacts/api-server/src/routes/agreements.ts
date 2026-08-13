import { randomUUID } from "crypto";
import { Router } from "express";
import { db, agreementsTable, projectsTable, usersTable, paymentsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function parseId(value: unknown): number | null {
  const id = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(id) ? id : null;
}

function generatePaymentReference(projectCode: string): string {
  return `GBX-PAY-${projectCode}-${randomUUID()}`;
}

router.get("/:agreementId", requireAuth, async (req, res): Promise<void> => {
  const agreementId = parseId(req.params.agreementId);
  if (agreementId === null) {
    res.status(400).json({ error: "Invalid agreement id" });
    return;
  }

  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, agreementId));
  if (!agreement) {
    res.status(404).json({ error: "Agreement not found" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, agreement.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (req.userRole === "client" && project.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [client] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, project.userId));

  res.json({
    ...agreement,
    projectTitle: project.title,
    projectCode: project.projectCode,
    serviceType: project.serviceType,
    clientName: client?.name ?? "Client",
  });
});

router.post("/:agreementId/accept", requireAuth, async (req, res): Promise<void> => {
  const agreementId = parseId(req.params.agreementId);
  if (agreementId === null) {
    res.status(400).json({ error: "Invalid agreement id" });
    return;
  }

  if (req.userRole !== "client" || !req.userId) {
    res.status(403).json({ error: "Only the project client can accept this agreement" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [agreement] = await tx.select().from(agreementsTable).where(eq(agreementsTable.id, agreementId));
      if (!agreement) throw Object.assign(new Error("Agreement not found"), { statusCode: 404 });

      await tx.execute(sql`SELECT pg_advisory_xact_lock(${agreement.projectId})`);

      const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, agreement.projectId));
      if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404 });
      if (project.userId !== req.userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
      if (!["agreement_sent", "agreement_accepted"].includes(project.status)) {
        throw Object.assign(new Error("This project is not ready for agreement acceptance"), { statusCode: 400 });
      }

      const amount = Number(agreement.price);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw Object.assign(new Error("Invalid agreement price"), { statusCode: 400 });
      }

      let updatedAgreement = agreement;
      if (!agreement.acceptedAt) {
        const [updated] = await tx.update(agreementsTable)
          .set({ acceptedAt: new Date(), acceptedByUserId: req.userId })
          .where(and(eq(agreementsTable.id, agreementId), sql`${agreementsTable.acceptedAt} IS NULL`))
          .returning();
        if (!updated) throw Object.assign(new Error("Agreement was already accepted"), { statusCode: 409 });
        updatedAgreement = updated;
      }

      if (project.status === "agreement_sent") {
        await tx.update(projectsTable)
          .set({ status: "agreement_accepted" })
          .where(and(eq(projectsTable.id, project.id), eq(projectsTable.status, "agreement_sent")));
      }

      const existingPayments = await tx.select()
        .from(paymentsTable)
        .where(and(
          eq(paymentsTable.projectId, project.id),
          eq(paymentsTable.gateway, "paystack"),
          inArray(paymentsTable.status, ["pending", "paid"]),
        ));

      let payment = existingPayments[0] ?? null;
      if (!payment) {
        const reference = generatePaymentReference(project.projectCode);
        const [created] = await tx.insert(paymentsTable).values({
          projectId: project.id,
          gateway: "paystack",
          amount: amount.toFixed(2),
          currency: "NGN",
          status: "pending",
          reference,
        }).returning();
        payment = created ?? null;
      }

      if (!payment) throw new Error("Payment record could not be created");

      return { agreement: updatedAgreement, payment };
    });

    res.json({ agreement: result.agreement, payment: result.payment, nextStep: "payment" });
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode >= 400 && statusCode < 500) {
      res.status(statusCode).json({ error: message });
      return;
    }
    console.error("[agreement/accept] failed", { agreementId, message, error });
    res.status(500).json({ error: "Unable to accept agreement" });
  }
});

export default router;
