export type Agent = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  instructions: string;
  tone: string;
  model: string;
  status: "draft" | "active" | "paused" | "disabled";
  welcomeMessage: string;
  enabledTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type Knowledge = { id: string; agentId: string; workspaceId: string; title: string; content: string; sourceType: string; status: string; createdAt: string; };
export type UsageSummary = { requests: number; responses: number; toolCalls: number; creditsUsed: number };

const baseUrl = (import.meta.env.VITE_GBOLIX_AGENT_URL ?? "").replace(/\/$/, "");

export function agentUrl(path: string): string {
  return `${baseUrl}${path}`;
}

export async function agentRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(agentUrl(path), { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `AI Agent request failed (${response.status})`);
  return payload as T;
}

export function isAgentConfigured(): boolean { return Boolean(baseUrl); }
