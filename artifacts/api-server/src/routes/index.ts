import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import projectsRouter from "./projects";
import filesRouter from "./files";
import messagesRouter from "./messages";
import adminRouter from "./admin";
import adminAnalyticsRouter from "./adminAnalytics";
import notificationsRouter from "./notifications";
import offersRouter from "./offers";
import paymentsRouter from "./payments";
import agreementsRouter from "./agreements";
import walletRouter from "./wallet";
import leadsRouter from "./leads";
import leadsIntegrationRouter from "./leadsIntegration";
import aiAgentIntegrationRouter from "./aiAgentIntegration";
import aiAgentSubscriptionsRouter from "./aiAgentSubscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/files", filesRouter);
router.use("/projects/:projectId/messages", messagesRouter);
router.use("/admin", adminRouter);
router.use("/admin", adminAnalyticsRouter);
router.use("/notifications", notificationsRouter);
router.use("/agreements", agreementsRouter);
router.use("/wallet", walletRouter);
router.use("/leads", leadsRouter);
router.use("/integrations/leads", leadsIntegrationRouter);
router.use("/internal", aiAgentIntegrationRouter);
router.use("/ai-agent/subscriptions", aiAgentSubscriptionsRouter);
router.use("/", paymentsRouter);
router.use("/", offersRouter);

export default router;
