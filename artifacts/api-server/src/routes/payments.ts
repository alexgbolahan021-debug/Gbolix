import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import {
  db,
  paymentsTable,
  projectsTable,
  agreementsTable,
  usersTable,
  messagesTable,
  notificationsTable,
  activityTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getCachedUsdToNgnRate, toPaystackSubunit, usdToNgnMajorUnits } from "../lib/exchange-rate";
import { handleAIAgentPaystackWebhook } from "./aiAgentSubscriptions";

const router = Router();

const PAYSTACK_API = "https://api.paystack.co";

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

function generatePaymentReference(projectCode: string): string {
  return `GBX-PAY-${projectCode}-${crypto.randomUUID()}`;
}

function webhookSignatureIsValid(req: RawBodyRequest): boolean {
  const signature = req.header("x-paystack-signature");
  if (!signature || !req.rawBody) return false;
  const expectedSignature = crypto
    .createHmac("sha512", secretKey())
    .update(req.rawBody)
    .digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

async function markPaymentPaid(reference: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
    if (!payment) return null;
    if (payment.status === "paid") return payment;

    const [updated] = await tx.update(paymentsTable).set({ status: "paid", paidAt: new Date() }).where(
      and(eq(paymentsTable.id, payment.id), eq(paymentsTable.status, "pending")),
    ).returning();

    if (!updated) {
      const [current] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, payment.id));
      return current ?? payment;
    }

    const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
    if (!project) throw new Error("Payment project not found");
    if (project.status !== "agreement_accepted") {
      throw new Error(`Guarded payment transition rejected: project ${project.id} is ${project.status}, expected agreement_accepted`);
    }

    const [updatedProject] = await tx.update(projectsTable).set({ status: "in_progress" }).where(
      and(eq(projectsTable.id, project.id), eq(projectsTable.status, "agreement_accepted")),
    ).returning();
    if (!updatedProject) throw new Error(`Guarded payment transition failed for project ${project.id}`);

    const [admin] = await tx.select().from(usersTable).where(eq(usersTable.role, "owner"));
    if (admin) {
      await tx.insert(messagesTable).values({
        projectId: project.id,
        senderId: admin.id,
        content: "Payment received successfully. Your project is now in progress. We'll keep you updated here as work begins.",
        isRead: false,
      });
    }

    await tx.insert(notificationsTable).values({
      userId: project.userId,
      projectId: project.id,
      title: "Payment Successful",
      message: `Payment received for "${project.title}". Your project is now in progress.`,
      type: "payment",
    });

    await tx.insert(activityTable).values({
      userId: project.userId,
      projectId: project.id,
      type: "status_change",
      description: `Payment received; project moved to in progress (${reference})`,
    });

    return updated;
  });
}

async function verifyWithPaystack(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = (await response.json()) as any;
  return { response, data };
}

async function finalizeVerifiedPayment(reference: string) {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) return { paid: false, error: "Payment not found" };
  if (payment.status === "paid") return { paid: true, payment };

  const { response, data } = await verifyWithPaystack(reference);
  if (!response.ok || !data?.status) {
    return { paid: false, error: data?.message || "Unable to verify payment" };
  }

  const paystackTransaction = data.data;
  const expectedAmountSubunit = toPaystackSubunit(Number(payment.amount));
  const requestedAmountSubunit = Number(paystackTransaction?.requested_amount);
  const chargedAmountSubunit = Number(paystackTransaction?.amount);
  // Paystack may include customer-paid fees in data.amount. requested_amount
  // is the merchant amount requested during initialization and is the value
  // that must match the stored payable amount when Paystack provides it.
  const amountMatches = Number.isFinite(requestedAmountSubunit)
    ? requestedAmountSubunit === expectedAmountSubunit
    : chargedAmountSubunit === expectedAmountSubunit;
  const currencyMatches = paystackTransaction?.currency === payment.currency;
  const transactionSucceeded = paystackTransaction?.status === "success";

  if (!transactionSucceeded || !amountMatches || !currencyMatches) {
    console.warn("Paystack verification did not match stored payment", {
      reference,
      transactionStatus: paystackTransaction?.status,
      expectedAmountSubunit,
      requestedAmountSubunit: Number.isFinite(requestedAmountSubunit) ? requestedAmountSubunit : null,
      chargedAmountSubunit: Number.isFinite(chargedAmountSubunit) ? chargedAmountSubunit : null,
      expectedCurrency: payment.currency,
      receivedCurrency: paystackTransaction?.currency,
    });
    return {
      paid: false,
      status: paystackTransaction?.status ?? "unknown",
      reason: !transactionSucceeded ? "transaction_not_successful" : !amountMatches ? "amount_mismatch" : "currency_mismatch",
    };
  }

  return { paid: true, payment: await markPaymentPaid(reference) };
}

router.post("/projects/:projectId/payments/paystack/initialize", requireAuth, async (req, res): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (project.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (project.status !== "agreement_accepted") {
      res.status(400).json({ error: "This project is not ready for payment" });
      return;
    }

    const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.projectId, projectId));
    if (!agreement || !agreement.acceptedAt || agreement.acceptedByUserId !== req.userId) {
      res.status(400).json({ error: "Accepted agreement is required before payment" });
      return;
    }

    const amount = Number(agreement.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid agreement price" });
      return;
    }

    const [client] = await db.select().from(usersTable).where(eq(usersTable.id, project.userId));
    if (!client?.email) {
      res.status(400).json({ error: "Client email is required before payment" });
      return;
    }

    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
    if (!callbackUrl) {
      res.status(500).json({ error: "PAYSTACK_CALLBACK_URL is not configured" });
      return;
    }

    const [payment] = await db.select().from(paymentsTable).where(and(
      eq(paymentsTable.projectId, projectId),
      eq(paymentsTable.gateway, "paystack"),
      eq(paymentsTable.status, "pending"),
    ));

    if (!payment) {
      res.status(409).json({ error: "Pending payment record not found. Please accept the agreement again to create a payment." });
      return;
    }

    const exchangeRate = await getCachedUsdToNgnRate();
    const chargeAmountNgn = usdToNgnMajorUnits(amount, exchangeRate.rate);

    const [repricedPayment] = await db.update(paymentsTable)
      .set({ amount: chargeAmountNgn.toFixed(2), currency: "NGN" })
      .where(and(eq(paymentsTable.id, payment.id), eq(paymentsTable.status, "pending")))
      .returning();

    if (!repricedPayment) {
      res.status(409).json({ error: "Payment is already being processed. Please refresh and try again." });
      return;
    }

    // The previous reference may already have been used by Paystack. If it
    // completed successfully, finalize it instead of charging again.
    const previousVerification = await verifyWithPaystack(repricedPayment.reference);
    if (previousVerification.response.ok && previousVerification.data?.status && previousVerification.data?.data?.status === "success") {
      const finalized = await finalizeVerifiedPayment(repricedPayment.reference);
      if (finalized.paid && finalized.payment) {
        res.json({ paid: true, payment: finalized.payment, reference: finalized.payment.reference });
        return;
      }
    }

    // Every new checkout attempt gets a fresh Paystack reference. Paystack
    // rejects a reference that has ever been used before, including a
    // previously abandoned/test checkout.
    const freshReference = generatePaymentReference(project.projectCode);
    const [updatedPayment] = await db.update(paymentsTable)
      .set({ reference: freshReference })
      .where(and(eq(paymentsTable.id, payment.id), eq(paymentsTable.status, "pending")))
      .returning();

    if (!updatedPayment) {
      res.status(409).json({ error: "Payment is already being processed. Please refresh and try again." });
      return;
    }

    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: toPaystackSubunit(Number(updatedPayment.amount)),
        currency: updatedPayment.currency,
        reference: updatedPayment.reference,
        email: client.email,
        callback_url: callbackUrl,
        metadata: {
          projectId,
          projectCode: project.projectCode,
          paymentId: updatedPayment.id,
          originalAmountUsd: amount,
          exchangeRateUsdToNgn: exchangeRate.rate,
          chargeAmountNgn,
        },
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok || !data?.status) {
      res.status(502).json({ error: data?.message || "Unable to initialize Paystack payment" });
      return;
    }

    res.status(201).json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: updatedPayment.reference,
      paymentId: updatedPayment.id,
      amount: Number(updatedPayment.amount),
      currency: updatedPayment.currency,
      originalAmountUsd: amount,
      exchangeRateUsdToNgn: exchangeRate.rate,
    });
  } catch (error) {
    console.error("Paystack initialization error", error);
    if (error instanceof Error && error.message.includes("Exchange rate")) {
      res.status(503).json({ error: "The USD/NGN exchange rate is temporarily unavailable. Please try again shortly." });
      return;
    }
    res.status(500).json({ error: "Unable to initialize payment" });
  }
});

router.get("/payments/:reference", requireAuth, async (req, res): Promise<void> => {
  const reference = String(req.params.reference);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
  if (!project || (req.userRole === "client" && project.userId !== req.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(payment);
});

router.post("/payments/paystack/verify/:reference", requireAuth, async (req, res): Promise<void> => {
  try {
    const reference = String(req.params.reference);
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.reference, reference));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, payment.projectId));
    if (!project || project.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const result = await finalizeVerifiedPayment(reference);
    if (result.paid) {
      res.json(result);
      return;
    }
    res.json({ payment, paid: false, status: result.status ?? "unknown", reason: result.reason });
  } catch (error) {
    console.error("Paystack verification error", error);
    res.status(500).json({ error: "Unable to verify payment" });
  }
});

router.post("/payments/paystack/webhook", async (req: RawBodyRequest, res: Response): Promise<void> => {
  try {
    if (!webhookSignatureIsValid(req)) {
      res.sendStatus(401);
      return;
    }

    const event = req.body as any;
    const eventType = String(event?.event ?? "");
    const eventReference = typeof event?.data?.reference === "string" ? event.data.reference : "";
    const isAIAgentSubscriptionEvent = eventReference.startsWith("GBX-AI-SUB-") || [
      "subscription.create",
      "invoice.update",
      "invoice.payment_failed",
      "subscription.not_renew",
      "subscription.disable",
    ].includes(eventType);
    if (isAIAgentSubscriptionEvent) {
      const handled = await handleAIAgentPaystackWebhook(req);
      res.sendStatus(handled ? 200 : 401);
      return;
    }

    if (event?.event === "charge.success" && event?.data?.reference) {
      const reference = String(event.data.reference);
      const result = await finalizeVerifiedPayment(reference);
      if (result.error === "Payment not found") {
        res.sendStatus(200);
        return;
      }
      if (!result.paid) {
        res.status(400).json({ error: result.error || "Payment not verified" });
        return;
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook error", error);
    res.sendStatus(500);
  }
});

export default router;
