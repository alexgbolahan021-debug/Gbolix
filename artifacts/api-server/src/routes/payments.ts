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

const router = Router();

const PAYSTACK_API = "https://api.paystack.co";

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;

  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  return key;
}

/**
 * Verify that a Paystack webhook actually came from Paystack.
 *
 * Paystack signs the exact raw request body with HMAC-SHA512
 * using the Paystack secret key.
 */
function webhookSignatureIsValid(req: RawBodyRequest): boolean {
  const signature = req.header("x-paystack-signature");

  if (!signature || !req.rawBody) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha512", secretKey())
    .update(req.rawBody)
    .digest("hex");

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Atomically transition a verified payment from pending -> paid and the
 * related request from agreement_accepted -> in_progress.
 *
 * This is the single guarded payment -> project transition. Only the
 * transaction that successfully changes the payment from pending to paid
 * is allowed to perform the downstream project/status side effects.
 */
async function markPaymentPaid(reference: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.reference, reference));

    if (!payment) {
      return null;
    }

    // A previous webhook/callback already completed this payment.
    if (payment.status === "paid") {
      return payment;
    }

    // The payment transition is guarded at the database level.
    const [updated] = await tx
      .update(paymentsTable)
      .set({
        status: "paid",
        paidAt: new Date(),
      })
      .where(
        and(
          eq(paymentsTable.id, payment.id),
          eq(paymentsTable.status, "pending"),
        ),
      )
      .returning();

    // Another concurrent request won the pending -> paid transition.
    if (!updated) {
      const [current] = await tx
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id));

      return current ?? payment;
    }

    // The project must still be waiting for payment. Do not allow a paid
    // payment to move an unrelated/advanced request into in_progress.
    const [project] = await tx
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, payment.projectId));

    if (!project) {
      throw new Error("Payment project not found");
    }

    if (project.status !== "agreement_accepted") {
      throw new Error(
        `Guarded payment transition rejected: project ${project.id} is ${project.status}, expected agreement_accepted`,
      );
    }

    const [updatedProject] = await tx
      .update(projectsTable)
      .set({
        status: "in_progress",
      })
      .where(
        and(
          eq(projectsTable.id, project.id),
          eq(projectsTable.status, "agreement_accepted"),
        ),
      )
      .returning();

    if (!updatedProject) {
      throw new Error(
        `Guarded payment transition failed for project ${project.id}`,
      );
    }

    const [admin] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "owner"));

    if (admin) {
      await tx.insert(messagesTable).values({
        projectId: project.id,
        senderId: admin.id,
        content:
          "Payment received successfully. Your project is now in progress. We'll keep you updated here as work begins.",
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

/**
 * Ask Paystack directly for the transaction status.
 */
async function verifyWithPaystack(reference: string) {
  const response = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey()}`,
      },
    },
  );

  const data = (await response.json()) as any;

  return {
    response,
    data,
  };
}

/**
 * Verify a payment against Paystack and Gbolix's own payment record.
 *
 * We verify:
 * - Paystack response is successful
 * - transaction status is success
 * - amount matches our payment
 * - currency matches our payment
 */
async function finalizeVerifiedPayment(reference: string) {
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.reference, reference));

  if (!payment) {
    return {
      paid: false,
      error: "Payment not found",
    };
  }

  // Already paid. Do not process it again.
  if (payment.status === "paid") {
    return {
      paid: true,
      payment,
    };
  }

  const { response, data } = await verifyWithPaystack(reference);

  if (!response.ok || !data?.status) {
    return {
      paid: false,
      error: data?.message || "Unable to verify payment",
    };
  }

  const paystackTransaction = data.data;

  const amountMatches =
    Number(paystackTransaction?.amount) ===
    Math.round(Number(payment.amount) * 100);

  const currencyMatches =
    paystackTransaction?.currency === payment.currency;

  const transactionSucceeded =
    paystackTransaction?.status === "success";

  if (!transactionSucceeded || !amountMatches || !currencyMatches) {
    return {
      paid: false,
      status: paystackTransaction?.status ?? "unknown",
    };
  }

  return {
    paid: true,
    payment: await markPaymentPaid(reference),
  };
}

/**
 * Initialize Paystack payment.
 */
router.post(
  "/projects/:projectId/payments/paystack/initialize",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const projectId = Number(req.params.projectId);

      if (!Number.isInteger(projectId)) {
        res.status(400).json({
          error: "Invalid project id",
        });
        return;
      }

      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        });
        return;
      }

      if (project.userId !== req.userId) {
        res.status(403).json({
          error: "Forbidden",
        });
        return;
      }

      if (project.status !== "agreement_accepted") {
        res.status(400).json({
          error: "This project is not ready for payment",
        });
        return;
      }

      const [agreement] = await db
        .select()
        .from(agreementsTable)
        .where(eq(agreementsTable.projectId, projectId));

      if (
        !agreement ||
        !agreement.acceptedAt ||
        agreement.acceptedByUserId !== req.userId
      ) {
        res.status(400).json({
          error: "Accepted agreement is required before payment",
        });
        return;
      }

      const amount = Number(agreement.price);

      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({
          error: "Invalid agreement price",
        });
        return;
      }

      const [client] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, project.userId));

      if (!client?.email) {
        res.status(400).json({
          error: "Client email is required before payment",
        });
        return;
      }

      const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;

      if (!callbackUrl) {
        res.status(500).json({
          error: "PAYSTACK_CALLBACK_URL is not configured",
        });
        return;
      }

      // Reuse the payment record created when the agreement was accepted.
      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.projectId, projectId),
            eq(paymentsTable.gateway, "paystack"),
            eq(paymentsTable.status, "pending"),
          ),
        );

      if (!payment) {
        res.status(409).json({
          error:
            "Pending payment record not found. Please accept the agreement again to create a payment.",
        });
        return;
      }

      if (
        Number(payment.amount) !== amount ||
        payment.currency !== "NGN"
      ) {
        res.status(409).json({
          error: "Payment amount does not match the accepted agreement",
        });
        return;
      }

      const response = await fetch(
        `${PAYSTACK_API}/transaction/initialize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(Number(payment.amount) * 100),
            currency: payment.currency,
            reference: payment.reference,
            email: client.email,
            callback_url: callbackUrl,
            metadata: {
              projectId,
              projectCode: project.projectCode,
              paymentId: payment.id,
            },
          }),
        },
      );

      const data = (await response.json()) as any;

      if (!response.ok || !data?.status) {
        res.status(502).json({
          error:
            data?.message || "Unable to initialize Paystack payment",
        });
        return;
      }

      res.status(201).json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: payment.reference,
        paymentId: payment.id,
      });
    } catch (error) {
      console.error("Paystack initialization error", error);

      res.status(500).json({
        error: "Unable to initialize payment",
      });
    }
  },
);

/**
 * Get payment by reference.
 */
router.get(
  "/payments/:reference",
  requireAuth,
  async (req, res): Promise<void> => {
    const reference = String(req.params.reference);

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.reference, reference));

    if (!payment) {
      res.status(404).json({
        error: "Payment not found",
      });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, payment.projectId));

    if (
      !project ||
      (req.userRole === "client" && project.userId !== req.userId)
    ) {
      res.status(403).json({
        error: "Forbidden",
      });
      return;
    }

    res.json(payment);
  },
);

/**
 * Client-side payment verification after Paystack redirects back.
 */
router.post(
  "/payments/paystack/verify/:reference",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const reference = String(req.params.reference);

      const [payment] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.reference, reference));

      if (!payment) {
        res.status(404).json({
          error: "Payment not found",
        });
        return;
      }

      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, payment.projectId));

      if (!project || project.userId !== req.userId) {
        res.status(403).json({
          error: "Forbidden",
        });
        return;
      }

      const result = await finalizeVerifiedPayment(reference);

      if (result.paid) {
        res.json(result);
        return;
      }

      res.json({
        payment,
        paid: false,
        status: result.status ?? "unknown",
      });
    } catch (error) {
      console.error("Paystack verification error", error);

      res.status(500).json({
        error: "Unable to verify payment",
      });
    }
  },
);

/**
 * Paystack webhook.
 *
 * IMPORTANT:
 * The request must have a valid X-Paystack-Signature.
 * We then independently verify the transaction with Paystack.
 */
router.post(
  "/payments/paystack/webhook",
  async (req: RawBodyRequest, res: Response): Promise<void> => {
    try {
      // STEP 1: Verify Paystack's webhook signature.
      if (!webhookSignatureIsValid(req)) {
        res.sendStatus(401);
        return;
      }

      const event = req.body as any;

      // STEP 2: Only process successful charge events.
      if (
        event?.event === "charge.success" &&
        event?.data?.reference
      ) {
        const reference = String(event.data.reference);

        // STEP 3: Independently verify the transaction with Paystack.
        const result = await finalizeVerifiedPayment(reference);

        // Unknown payment references are acknowledged but never paid.
        if (result.error === "Payment not found") {
          res.sendStatus(200);
          return;
        }

        // Payment failed verification.
        if (!result.paid) {
          res.status(400).json({
            error: result.error || "Payment not verified",
          });
          return;
        }
      }

      // Paystack received the webhook successfully.
      res.sendStatus(200);
    } catch (error) {
      console.error("Paystack webhook error", error);

      res.sendStatus(500);
    }
  },
);

export default router;
