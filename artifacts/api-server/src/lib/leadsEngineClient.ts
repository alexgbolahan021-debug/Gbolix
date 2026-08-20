import crypto from "node:crypto";
import { WalletError } from "./walletService";

export type GbolixLeadsEngineRequest = {
  externalRequestId: string;
  externalWorkspaceId: string;
  externalCustomerId?: string;
  actorId?: string;
  creditAuthorizationId: string;
  label: string;
  inputType: "csv_upload" | "domain_list";
  rawContent: string;
  categoryCode: string;
};

export async function dispatchGbolixLeadsRequest(payload: GbolixLeadsEngineRequest) {
  const baseUrl = process.env.GBOLIX_LEADS_ENGINE_URL?.replace(/\/$/, "");
  const secret = process.env.GBOLIX_LEADS_SHARED_SECRET;
  if (!baseUrl || !secret) throw new WalletError("LEADS_ENGINE_NOT_CONFIGURED", "Gbolix Leads is not configured for production dispatch yet", 503);
  const timestamp = new Date().toISOString();
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${JSON.stringify(payload)}`).digest("hex");
  const response = await fetch(`${baseUrl}/api/integrations/gbolix/leads/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Gbolix-Timestamp": timestamp, "X-Gbolix-Signature": signature },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null) as { jobId?: string; error?: string; message?: string } | null;
  if (!response.ok || !data?.jobId) throw new WalletError("LEADS_ENGINE_DISPATCH_FAILED", data?.message ?? data?.error ?? "Gbolix Leads did not accept the request", 502);
  return data;
}
