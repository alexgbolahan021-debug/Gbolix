import { Router, type Request, type Response } from "express";
import { db, paymentsTable, projectsTable, agreementsTable, usersTable, messagesTable, notificationsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const PAYSTACK_API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function markPaymentPaid(reference: string) {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) return null;
  if (payment.status === "paid") return payment;
  const [updated] = await db.update(paymentsTable).set({ status: "paid", paidAt: new Date() }).where(and(eq(paymentsTable.id, payment.id), eq(paymentsTable.status, "pending"))).returning();
  if (!updated) return payment;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
  if (project) {
    await db.update(projectsTable).set({ status: "in_progress" }).where(and(eq(projectsTable.id, project.id), eq(projectsTable.status, "agreement_accepted")));
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "owner"));
    if (admin) await db.insert(messagesTable).values({ projectId: project.id, senderId: admin.id, content: "Payment received successfully. Your project is now in progress. We'll keep you updated here as work begins.", isRead: false });
    await db.insert(notificationsTable).values({ userId: project.userId, projectId: project.id, title: "Payment Successful", message: `Payment received for "${project.title}". Your project is now in progress.`, type: "payment" });
    await db.insert(activityTable).values({ userId: project.userId, projectId: project.id, type: "status_change", description: `Payment received; project moved to in progress (${reference})` });
  }
  return updated;
}

async function verifyWithPaystack(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey()}` } });
  const data = await response.json() as any;
  return { response, data };
}

async function finalizeVerifiedPayment(reference: string) {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) return { paid: false, error: "Payment not found" };
  const { response, data } = await verifyWithPaystack(reference);
  if (!response.ok || !data?.status) return { paid: false, error: data?.message || "Unable to verify payment" };
  const valid = data.data?.status === "success" && Number(data.data.amount) === Math.round(Number(payment.amount) * 100) && data.data.currency === payment.currency;
  if (!valid) return { paid: false, status: data.data?.status ?? "unknown" };
  return { paid: true, payment: await markPaymentPaid(reference) };
}

router.post("/projects/:projectId/payments/paystack/initialize", requireAuth, async (req, res): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (project.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (project.status !== "agreement_accepted") { res.status(400).json({ error: "This project is not ready for payment" }); return; }
    const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.projectId, projectId));
    if (!agreement || !agreement.acceptedAt) { res.status(400).json({ error: "Accepted agreement is required before payment" }); return; }
    const amount = Number(agreement.price);
    if (!Number.isFinite(amount) || amount <= 0) { res.status(400).json({ error: "Invalid agreement price" }); return; }
    const [client] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));
    if (!client?.email) { res.status(400).json({ error: "Client email is required before payment" }); return; }
    const existing = await db.select().from(paymentsTable).where(and(eq(paymentsTable.projectId, projectId), eq(paymentsTable.gateway, "paystack"), eq(paymentsTable.status, "pending")));
    let reference = existing[0]?.reference;
    if (reference) {
      const result = await finalizeVerifiedPayment(reference);
      if (result.paid) { res.json(result); return; }
    } else {
      reference = `GBX-${project.projectCode}-${Date.now()}`.replace(/[^A-Za-z0-9._-]/g, "-");
      await db.insert(paymentsTable).values({ projectId, gateway: "paystack", amount: amount.toFixed(2), currency: "NGN", status: "pending", reference });
    }
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, { method: "POST", headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(amount * 100), currency: "NGN", reference, email: client.email, metadata: { projectId, projectCode: project.projectCode } }) });
    const data = await response.json() as any;
    if (!response.ok || !data?.status) { res.status(502).json({ error: data?.message || "Unable to initialize Paystack payment" }); return; }
    res.status(201).json({ authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference });
  } catch (error) { console.error("Paystack initialization error", error); res.status(500).json({ error: "Unable to initialize payment" }); }
});

router.get("/payments/:reference", requireAuth, async (req, res): Promise<void> => {
  const reference = String(req.params.reference);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
  if (!project || (req.userRole === "client" && project.userId !== req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(payment);
});

router.post("/payments/paystack/verify/:reference", requireAuth, async (req, res): Promise<void> => {
  try {
    const reference = String(req.params.reference);
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
    if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
    if (!project || project.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const result = await finalizeVerifiedPayment(reference);
    if (result.paid) { res.json(result); return; }
    res.json({ payment, paid: false, status: result.status ?? "unknown" });
  } catch (error) { console.error("Paystack verification error", error); res.status(500).json({ error: "Unable to verify payment" }); }
});

router.post("/payments/paystack/webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body as any;
    if (event?.event === "charge.success" && event?.data?.reference) {
      const result = await finalizeVerifiedPayment(String(event.data.reference));
      if (result.error === "Payment not found") { res.sendStatus(200); return; }
      if (!result.paid) { res.status(400).json({ error: result.error || "Payment not verified" }); return; }
    }
    res.sendStatus(200);
  } catch (error) { console.error("Paystack webhook error", error); res.sendStatus(500); }
});

export default router;
