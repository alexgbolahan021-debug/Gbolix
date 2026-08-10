import { Router } from "express";
import { db, offersTable, agreementsTable, projectsTable, messagesTable, notificationsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";

const router = Router();

function parseOfferId(value: unknown): number | null {
  const id = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(id) ? id : null;
}

async function loadOfferProject(offerId: number) {
  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) return { offer: null, project: null };
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
  return { offer, project: project ?? null };
}

router.post("/projects/:projectId/offers", requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseOfferId(req.params.projectId);
  if (projectId === null) { res.status(400).json({ error: "Invalid project id" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (!["approved", "needs_info"].includes(project.status)) {
    res.status(400).json({ error: "Offer can only be created for an approved or needs-info request" });
    return;
  }

  const body = req.body ?? {};
  const serviceType = String(body.serviceType ?? project.serviceType ?? "").trim();
  const serviceName = String(body.serviceName ?? project.title ?? "").trim();
  const scope = String(body.scope ?? project.description ?? "").trim();
  const requirements = body.requirements !== undefined
    ? String(body.requirements)
    : project.requirements ? JSON.stringify(project.requirements) : null;
  const price = body.price !== undefined
    ? String(body.price).trim()
    : project.price !== null ? String(project.price) : "";

  if (!serviceType || !serviceName || !scope || !price) {
    res.status(400).json({ error: "Service, service name, scope, and price are required" });
    return;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }

  const shouldSend = body.send === true;
  if (!shouldSend) {
    const [offer] = await db.insert(offersTable).values({
      projectId,
      serviceType,
      serviceName,
      scope,
      requirements,
      price,
      deliveryEstimate: body.deliveryEstimate ? String(body.deliveryEstimate).trim() : null,
      terms: body.terms ? String(body.terms).trim() : null,
      status: "draft",
    }).returning();
    res.status(201).json(offer);
    return;
  }

  const senderId = req.userId;
  if (!senderId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const [offer] = await tx.insert(offersTable).values({
        projectId,
        serviceType,
        serviceName,
        scope,
        requirements,
        price,
        deliveryEstimate: body.deliveryEstimate ? String(body.deliveryEstimate).trim() : null,
        terms: body.terms ? String(body.terms).trim() : null,
        status: "sent",
        sentAt: new Date(),
      }).returning();

      if (!offer) throw new Error("Offer could not be created");

      const [message] = await tx.insert(messagesTable).values({
        projectId,
        senderId,
        content: "Great news! We have reviewed your request and prepared an offer for your project. Please review the offer below.",
        isRead: false,
      }).returning();

      await tx.insert(notificationsTable).values({
        userId: project.userId,
        projectId,
        title: "New Project Offer",
        message: `A project offer is ready for \"${project.title}\"`,
        type: "admin_reply",
      });

      await tx.insert(activityTable).values({
        userId: project.userId,
        projectId,
        type: "admin_response",
        description: `Offer sent for project: ${project.title}`,
      });

      return { offer, message };
    });

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[offers/create-send] failed", { projectId, message, error });
    res.status(500).json({ error: "Offer send failed", detail: message });
  }
});

router.get("/projects/:projectId/offers", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseOfferId(req.params.projectId);
  if (projectId === null) { res.status(400).json({ error: "Invalid project id" }); return; }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (req.userRole === "client" && project.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const offers = await db.select().from(offersTable).where(eq(offersTable.projectId, projectId));
  res.json(offers.sort((a, b) => {
    const aTime = (a.sentAt ?? a.createdAt).getTime();
    const bTime = (b.sentAt ?? b.createdAt).getTime();
    return aTime - bTime;
  }));
});

router.post("/offers/:offerId/send", requireAdmin, async (req, res): Promise<void> => {
  const offerId = parseOfferId(req.params.offerId);
  if (offerId === null) { res.status(400).json({ error: "Invalid offer id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const [offer] = await tx.select().from(offersTable).where(eq(offersTable.id, offerId));
      if (!offer) throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
      if (offer.status !== "draft") throw Object.assign(new Error("Only draft offers can be sent"), { statusCode: 400 });

      const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
      if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404 });
      const senderId = req.userId;
      if (!senderId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

      const [updatedOffer] = await tx.update(offersTable)
        .set({ status: "sent", sentAt: new Date() })
        .where(and(eq(offersTable.id, offerId), eq(offersTable.status, "draft")))
        .returning();
      if (!updatedOffer) throw Object.assign(new Error("Offer was already sent"), { statusCode: 409 });

      const [message] = await tx.insert(messagesTable).values({
        projectId: offer.projectId,
        senderId,
        content: "Great news! We have reviewed your request and prepared an offer for your project. Please review the offer below.",
        isRead: false,
      }).returning();

      await tx.insert(notificationsTable).values({
        userId: project.userId,
        projectId: offer.projectId,
        title: "New Project Offer",
        message: `A project offer is ready for \"${project.title}\"`,
        type: "admin_reply",
      });

      await tx.insert(activityTable).values({
        userId: project.userId,
        projectId: offer.projectId,
        type: "admin_response",
        description: `Offer sent for project: ${project.title}`,
      });

      return { offer: updatedOffer, message };
    });

    res.status(200).json(result);
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode >= 400 && statusCode < 500) { res.status(statusCode).json({ error: message }); return; }
    console.error(`[offers/send] FAILED offerId=${offerId}`, { message, error });
    res.status(500).json({ error: "Offer send failed", detail: message });
  }
});

router.post("/offers/:offerId/withdraw", requireAdmin, async (req, res): Promise<void> => {
  const offerId = parseOfferId(req.params.offerId);
  if (offerId === null) { res.status(400).json({ error: "Invalid offer id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const [offer] = await tx.select().from(offersTable).where(eq(offersTable.id, offerId));
      if (!offer) throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
      if (offer.status !== "sent") throw Object.assign(new Error("Only sent offers can be withdrawn"), { statusCode: 400 });

      const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
      if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404 });
      const senderId = req.userId;
      if (!senderId) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });

      const [updatedOffer] = await tx.update(offersTable)
        .set({ status: "withdrawn" })
        .where(and(eq(offersTable.id, offerId), eq(offersTable.status, "sent")))
        .returning();
      if (!updatedOffer) throw Object.assign(new Error("Offer was already changed"), { statusCode: 409 });

      await tx.insert(messagesTable).values({
        projectId: offer.projectId,
        senderId,
        content: "The previous project offer has been withdrawn and is no longer available for acceptance.",
        isRead: false,
      });

      await tx.insert(notificationsTable).values({
        userId: project.userId,
        projectId: offer.projectId,
        title: "Offer Withdrawn",
        message: `The offer for \"${project.title}\" has been withdrawn.`,
        type: "admin_reply",
      });

      await tx.insert(activityTable).values({
        userId: project.userId,
        projectId: offer.projectId,
        type: "admin_response",
        description: `Offer withdrawn for project: ${project.title}`,
      });

      return updatedOffer;
    });

    res.status(200).json({ offer: result });
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode >= 400 && statusCode < 500) { res.status(statusCode).json({ error: message }); return; }
    console.error(`[offers/withdraw] FAILED offerId=${offerId}`, { message, error });
    res.status(500).json({ error: "Offer withdrawal failed", detail: message });
  }
});

router.post("/offers/:offerId/accept", requireAuth, async (req, res): Promise<void> => {
  const offerId = parseOfferId(req.params.offerId);
  if (offerId === null) { res.status(400).json({ error: "Invalid offer id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const [offer] = await tx.select().from(offersTable).where(eq(offersTable.id, offerId));
      if (!offer) throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
      const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
      if (!project || project.userId !== req.userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
      if (offer.status !== "sent") throw Object.assign(new Error("Only sent offers can be accepted"), { statusCode: 400 });

      const [updatedOffer] = await tx.update(offersTable)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(and(eq(offersTable.id, offerId), eq(offersTable.status, "sent")))
        .returning();
      if (!updatedOffer) throw Object.assign(new Error("Offer was already changed"), { statusCode: 409 });

      await tx.update(projectsTable).set({ status: "approved" }).where(eq(projectsTable.id, offer.projectId));
      await tx.insert(messagesTable).values({
        projectId: offer.projectId,
        senderId: req.userId!,
        content: "I accepted the project offer. Please prepare the agreement and next steps.",
        isRead: false,
      });
      await tx.insert(activityTable).values({
        userId: project.userId,
        projectId: project.id,
        type: "status_change",
        description: `Offer accepted for project: ${project.title}`,
      });

      return updatedOffer;
    });

    res.json({ offer: result, nextStep: "agreement" });
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode >= 400 && statusCode < 500) { res.status(statusCode).json({ error: message }); return; }
    res.status(500).json({ error: "Offer acceptance failed", detail: message });
  }
});

router.post("/offers/:offerId/decline", requireAuth, async (req, res): Promise<void> => {
  const offerId = parseOfferId(req.params.offerId);
  if (offerId === null) { res.status(400).json({ error: "Invalid offer id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const [offer] = await tx.select().from(offersTable).where(eq(offersTable.id, offerId));
      if (!offer) throw Object.assign(new Error("Offer not found"), { statusCode: 404 });
      const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
      if (!project || project.userId !== req.userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
      if (offer.status !== "sent") throw Object.assign(new Error("Only sent offers can be declined"), { statusCode: 400 });

      const [updatedOffer] = await tx.update(offersTable)
        .set({ status: "declined", declinedAt: new Date() })
        .where(and(eq(offersTable.id, offerId), eq(offersTable.status, "sent")))
        .returning();
      if (!updatedOffer) throw Object.assign(new Error("Offer was already changed"), { statusCode: 409 });

      await tx.insert(messagesTable).values({
        projectId: offer.projectId,
        senderId: req.userId!,
        content: "I declined the project offer. Thank you for reviewing my request.",
        isRead: false,
      });
      await tx.insert(activityTable).values({
        userId: project.userId,
        projectId: project.id,
        type: "status_change",
        description: `Offer declined for project: ${project.title}`,
      });

      return updatedOffer;
    });

    res.json({ offer: result });
  } catch (error) {
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (statusCode >= 400 && statusCode < 500) { res.status(statusCode).json({ error: message }); return; }
    res.status(500).json({ error: "Offer decline failed", detail: message });
  }
});

router.post("/offers/:offerId/agreement", requireAdmin, async (req, res): Promise<void> => {
  const offerId = parseOfferId(req.params.offerId);
  if (offerId === null) { res.status(400).json({ error: "Invalid offer id" }); return; }
  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (offer.status !== "accepted") { res.status(400).json({ error: "The offer must be accepted before an agreement is created" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const existing = await db.select().from(agreementsTable).where(eq(agreementsTable.projectId, project.id));
  if (existing.length) { res.json(existing[0]); return; }
  const body = req.body ?? {};
  const scope = String(body.scope ?? offer.scope ?? "").trim();
  const deliverables = String(body.deliverables ?? offer.serviceName ?? "").trim();
  const timeline = String(body.timeline ?? offer.deliveryEstimate ?? "").trim();
  const revisions = String(body.revisions ?? "As agreed in the project scope").trim();
  const price = String(body.price ?? offer.price ?? "").trim();
  const terms = String(body.terms ?? offer.terms ?? "").trim();
  if (!scope || !deliverables || !timeline || !revisions || !price || !terms) { res.status(400).json({ error: "Scope, deliverables, timeline, revisions, price, and terms are required" }); return; }
  const [agreement] = await db.insert(agreementsTable).values({ projectId: project.id, scope, deliverables, timeline, revisions, price, terms }).returning();
  await db.update(projectsTable).set({ status: "agreement_sent" }).where(eq(projectsTable.id, project.id));
  const senderId = req.userId;
  if (!senderId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.insert(messagesTable).values({ projectId: project.id, senderId, content: "Your project agreement is ready. Please review the agreement below and accept it to continue to payment.", isRead: false });
  await db.insert(notificationsTable).values({ userId: project.userId, projectId: project.id, title: "Project Agreement Ready", message: `Your agreement for \"${project.title}\" is ready for review.`, type: "agreement" });
  await db.insert(activityTable).values({ userId: project.userId, projectId: project.id, type: "admin_response", description: `Agreement sent for project: ${project.title}` });
  res.status(201).json(agreement);
});

router.get("/projects/:projectId/agreement", requireAuth, async (req, res): Promise<void> => {
  const projectId = parseOfferId(req.params.projectId);
  if (projectId === null) { res.status(400).json({ error: "Invalid project id" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (req.userRole === "client" && project.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.projectId, projectId));
  if (!agreement) { res.status(404).json({ error: "Agreement not found" }); return; }
  res.json(agreement);
});

router.post("/agreements/:agreementId/accept", requireAuth, async (req, res): Promise<void> => {
  const agreementId = parseOfferId(req.params.agreementId);
  if (agreementId === null) { res.status(400).json({ error: "Invalid agreement id" }); return; }
  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, agreementId));
  if (!agreement) { res.status(404).json({ error: "Agreement not found" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, agreement.projectId));
  if (!project || project.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (project.status !== "agreement_sent" || agreement.acceptedAt) { res.status(400).json({ error: "This agreement is not awaiting acceptance" }); return; }
  const [updatedAgreement] = await db.update(agreementsTable).set({ acceptedAt: new Date(), acceptedByUserId: req.userId }).where(eq(agreementsTable.id, agreementId)).returning();
  await db.update(projectsTable).set({ status: "payment_pending" }).where(eq(projectsTable.id, project.id));
  await db.insert(activityTable).values({ userId: project.userId, projectId: project.id, type: "status_change", description: `Agreement accepted for project: ${project.title}` });
  res.json({ agreement: updatedAgreement, nextStep: "payment" });
});

export default router;
