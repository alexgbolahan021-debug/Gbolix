import { Router } from "express";
import { db, offersTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/projects/:projectId/offers", requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId as string, 10);
  if (!Number.isInteger(projectId)) { res.status(400).json({ error: "Invalid project id" }); return; }
  const offers = await db.select().from(offersTable).where(eq(offersTable.projectId, projectId));
  res.json(offers);
});

export default router;
