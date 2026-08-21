import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, workspacesTable } from "@workspace/db";
import { finalizeCredits, releaseCredits, reserveAIAgentCredits, WalletError } from "../lib/walletService";

const router = Router();

router.use((req, res, next) => {
  const expected = process.env.GBOLIX_AI_AGENT_PLATFORM_TOKEN;
  const authorization = req.header("authorization");
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : req.header("x-gbolix-platform-token");
  if (!expected || !supplied || !safeEqual(expected, supplied)) return res.status(401).json({ error: "INTERNAL_AUTH_REQUIRED" });
  return next();
});

router.post("/credit-authorizations", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const rawWorkspaceKey = String(body.workspaceKey ?? body.workspaceId ?? "");
    const requestKey = String(body.requestKey ?? body.sourceKey ?? "");
    const maximumCredits = Number(body.maximumCredits ?? 0);
    if (!rawWorkspaceKey || !requestKey || !Number.isInteger(maximumCredits) || maximumCredits <= 0) return res.status(400).json({ error: "INVALID_CREDIT_AUTHORIZATION" });
    const workspaceKey = await resolveWalletWorkspaceKey(rawWorkspaceKey);
    const result = await reserveAIAgentCredits({ workspaceKey, requestKey, maximumCredits, agentId: typeof body.agentId === "string" ? body.agentId : undefined });
    return res.status(result.reused ? 200 : 201).json({ authorizationKey: result.authorization.authorizationKey, maximumCredits: result.authorization.maximumCredits, expiresAt: result.authorization.expiresAt });
  } catch (error) { return walletErrorResponse(res, error); }
});

router.post("/credit-authorizations/:authorizationKey/release", async (req, res) => {
  try {
    const authorizationKey = String(req.params.authorizationKey);
    const body = req.body as Record<string, unknown>;
    const result = await releaseCredits({ authorizationKey, releaseKey: String(body.releaseKey ?? `${authorizationKey}:release`), reason: String(body.reason ?? "AI Agent request failed"), sourceType: "gbolix_ai_agent" });
    return res.json({ authorizationKey: result.authorization.authorizationKey, state: result.authorization.state, reused: result.reused });
  } catch (error) { return walletErrorResponse(res, error); }
});

router.post("/usage-events", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const authorizationKey = String(body.authorizationKey ?? "");
    const requestId = String(body.requestId ?? body.usageEventKey ?? "");
    const credits = Number(body.credits ?? body.finalizedCredits ?? 0);
    if (!authorizationKey || !requestId || !Number.isInteger(credits) || credits < 0) return res.status(400).json({ error: "INVALID_USAGE_EVENT" });
    const result = await finalizeCredits({ authorizationKey, finalizedCredits: credits, usageEventKey: requestId, sourceType: "gbolix_ai_agent", metadata: { agentId: body.agentId, conversationId: body.conversationId, model: body.model, inputTokens: body.inputTokens, outputTokens: body.outputTokens, toolCalls: body.toolCalls, eventType: body.eventType ?? "agent_response" } });
    return res.json({ authorizationKey: result.authorization.authorizationKey, state: result.authorization.state, finalizedCredits: result.authorization.finalizedCredits, releasedCredits: result.authorization.releasedCredits, reused: result.reused });
  } catch (error) { return walletErrorResponse(res, error); }
});

function walletErrorResponse(res: Response, error: unknown) {
  if (error instanceof WalletError) return res.status(error.status).json({ error: error.code, message: error.message });
  console.error("AI Agent credit integration error", error);
  return res.status(500).json({ error: "AI_AGENT_CREDIT_INTEGRATION_FAILED" });
}
function safeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); }

async function resolveWalletWorkspaceKey(rawWorkspaceKey: string) {
  const [directWorkspace] = await db.select({ workspaceKey: workspacesTable.workspaceKey }).from(workspacesTable).where(eq(workspacesTable.workspaceKey, rawWorkspaceKey)).limit(1);
  if (directWorkspace) return directWorkspace.workspaceKey;

  const clerkIdCandidates = [rawWorkspaceKey, rawWorkspaceKey.replace(/^workspace[_:]/, "")];
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkIdCandidates[0])).limit(1);
  if (user) return `gws_user_${user.id}`;
  if (clerkIdCandidates[1] !== clerkIdCandidates[0]) {
    const [prefixedUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkIdCandidates[1])).limit(1);
    if (prefixedUser) return `gws_user_${prefixedUser.id}`;
  }
  throw new WalletError("WORKSPACE_NOT_FOUND", "The Gbolix workspace could not be resolved", 404);
}

export default router;
