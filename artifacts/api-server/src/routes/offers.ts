import { Router } from "express";
import { db, offersTable, projectsTable, messagesTable, notificationsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

router.post("/projects/:projectId/offers", requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  if (!Number.isInteger(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  if (!["approved", "needs_info"].includes(project.status)) { res.status(400).json({ error: "Offer can only be created for an approved or needs-info request" }); return; }
  const body = req.body ?? {};
  const serviceType = String(body.serviceType ?? project.serviceType ?? "").trim();
  const serviceName = String(body.serviceName ?? project.title ?? "").trim();
  const scope = String(body.scope ?? project.description ?? "").trim();
  const requirements = body.requirements !== undefined ? String(body.requirements) : project.requirements ? JSON.stringify(project.requirements) : null;
  const price = body.price !== undefined ? String(body.price) : project.price !== null ? String(project.price) : "";
  if (!serviceType || !serviceName || !scope || !price) { res.status(400).json({ error: "Service, service name, scope, and price are required" }); return; }
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) < 0) { res.status(400).json({ error: "Invalid price" }); return; }
  const [offer] = await db.insert(offersTable).values({ projectId, serviceType, serviceName, scope, requirements, price, deliveryEstimate: body.deliveryEstimate ? String(body.deliveryEstimate) : null, terms: body.terms ? String(body.terms) : null, status: "draft" }).returning();
  res.status(201).json(offer);
});

router.post("/offers/:offerId/send", requireAdmin, async (req, res): Promise<void> => {
  const offerId = parseInt(req.params.offerId as string, 10);
  if (!Number.isInteger(offerId)) { res.status(400).json({ error: "Invalid offer id" }); return; }
  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
  if (offer.status !== "draft") { res.status(400).json({ error: "Only draft offers can be sent" }); return; }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, offer.projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [updatedOffer] = await db.update(offersTable).set({ status: "sent", sentAt: new Date() }).where(and(eq(offersTable.id, offerId), eq(offersTable.status, "draft"))).returning();
  if (!updatedOffer) { res.status(409).json({ error: "Offer was already sent" }); return; }
  const [offerMessage] = await db.insert(messagesTable).values({ projectId: offer.projectId, senderId: userId, content: `Great news! We have reviewed your request and prepared an offer for your project. Please review the offer below and accept it to continue to payment.`, isRead: false }).returning();
  await db.insert(notificationsTable).values({ userId: project.userId, projectId: offer.projectId, title: "New Project Offer", message: `A project offer is ready for "${project.title}"`, type: "new_offer" });
  await db.insert(activityTable).values({ userId: project.userId, projectId: offer.projectId, type: "admin_response", description: `Offer sent for project: ${project.title}` });
  res.status(200).json({ offer: updatedOffer, message: offerMessage });
});

router.get("/projects/:projectId/offers", requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  if (!Number.isInteger(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const offers = await db.select().from(offersTable).where(eq(offersTable.projectId, projectId));
  res.json(offers);
});

export default router;
