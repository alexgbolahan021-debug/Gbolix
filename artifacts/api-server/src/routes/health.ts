import { Router, type IRouter } from "express";
import { buildHealthResponse } from "../lib/healthResponse";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json(buildHealthResponse());
});

export default router;
