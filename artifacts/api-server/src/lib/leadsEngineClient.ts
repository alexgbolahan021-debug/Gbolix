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

export type GbolixLeadsResultsRequest = {
  externalRequestId: string;
  externalWorkspaceId: string;
  actorId?: string;
};

export type GbolixLeadResult = {
  id: string;
  businessName: string;
  categoryCode: string | null;
  website: string | null;
  publicEmail: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  dataConfidence: number;
  score: number | null;
  scoreVersion: string | null;
};

export type GbolixLeadsResultsResponse = {
  job: { id: string; status: string; requestedCount: number; processedCount: number; qualifiedCount: number; duplicateCount: number; completedAt: string | null };
  leadIds: string[];
  leads: GbolixLeadResult[];
};

export type GbolixLeadsExportResponse = {
  exportId: string;
  leadCount: number;
  expiresAt: string;
  downloadUrl: string;
  downloadExpiresAt: string;
};

async function signedEnginePost<T>(path: string, payload: object, fallbackError: string) {
  const baseUrl = process.env.GBOLIX_LEADS_ENGINE_URL?.replace(/\/$/, "");
  const secret = process.env.GBOLIX_LEADS_SHARED_SECRET;
  if (!baseUrl || !secret) throw new WalletError("LEADS_ENGINE_NOT_CONFIGURED", "Gbolix Leads is not configured for production dispatch yet", 503);
  const timestamp = new Date().toISOString();
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gbolix-Timestamp": timestamp, "X-Gbolix-Signature": signature }, body });
  const data = await response.json().catch(() => null) as (T & { error?: string; message?: string }) | null;
  if (!response.ok || !data) throw new WalletError("LEADS_ENGINE_REQUEST_FAILED", data?.message ?? data?.error ?? fallbackError, 502);
  return data;
}

export async function dispatchGbolixLeadsRequest(payload: GbolixLeadsEngineRequest) {
  const data = await signedEnginePost<{ jobId?: string }>("/api/integrations/gbolix/leads/ingest", payload, "Gbolix Leads did not accept the request");
  if (!data.jobId) throw new WalletError("LEADS_ENGINE_DISPATCH_FAILED", "Gbolix Leads did not return an accepted job identifier", 502);
  return data;
}

export function getGbolixLeadsResults(payload: GbolixLeadsResultsRequest) {
  return signedEnginePost<GbolixLeadsResultsResponse>("/api/integrations/gbolix/leads/results", payload, "Gbolix Leads results are unavailable");
}

export function createGbolixLeadsExport(payload: GbolixLeadsResultsRequest) {
  return signedEnginePost<GbolixLeadsExportResponse>("/api/integrations/gbolix/leads/exports", payload, "Gbolix Leads export is unavailable");
}
