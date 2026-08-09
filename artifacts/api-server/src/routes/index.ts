import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import projectsRouter from "./projects";
import filesRouter from "./files";
import messagesRouter from "./messages";
import adminRouter from "./admin";
import notificationsRouter from "./notifications";
import offersRouter from "./offers";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/files", filesRouter);
router.use("/projects/:projectId/messages", messagesRouter);
router.use("/admin", adminRouter);
router.use("/notifications", notificationsRouter);
router.use("/", offersRouter);

export default router;
