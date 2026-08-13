import { Router } from "express";
import { db, agreementsTable, projectsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function parseId(value: unknown): number | null {
  const id = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(id) ? id : null;
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

export default router;
