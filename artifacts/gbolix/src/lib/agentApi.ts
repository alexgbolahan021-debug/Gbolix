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
export type Conversation = { id: string; agentId: string; workspaceId: string; channel: string; visitorKey: string; status: string; createdAt: string; updatedAt: string };
export type ConversationMessage = { id: string; conversationId: string; role: string; content: string; toolName?: string; createdAt: string };
export type Deployment = { id: string; agentId: string; workspaceId: string; channel: string; allowedOrigin?: string; tokenPrefix: string; status: string; createdAt: string; updatedAt: string };
export type ApiKey = { id: string; agentId: string; workspaceId: string; keyPrefix: string; status: string; createdAt: string; lastUsedAt?: string };
export type WalletLedgerEntry = { id: string; type: string; credits: number; sourceType: string; sourceKey: string; metadata?: Record<string, unknown>; createdAt: string };

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

export type AdminOverview = { customers: number; agents: number; responses: number; creditsUsed?: number; credits_used?: number; deployments?: number };
export type AdminCustomer = { workspaceId: string; customerName?: string; customerEmail?: string; agents: number; responses: number; creditsUsed: number };
export type AdminAgent = Agent & { knowledgeCount: number; conversationCount: number; responses: number; creditsUsed: number; deploymentCount: number };
export type AdminConversation = { id: string; agentId: string; workspaceId: string; channel: string; visitorKey: string; status: string; createdAt: string; updatedAt: string; agentName: string; messageCount: number; lastMessage?: string };
export type AdminMessage = { id: string; conversationId: string; role: string; content: string; toolName?: string; createdAt: string };
export type AdminUsageEvent = { requestId: string; workspaceId: string; agentId: string; conversationId: string; model: string; inputTokens: number; outputTokens: number; toolCalls: number; credits: number; status: string; channel: string; createdAt: string; agentName: string };
export type AdminDeployment = { id: string; agentId: string; workspaceId: string; channel: string; allowedOrigin?: string; tokenPrefix: string; status: string; createdAt: string; updatedAt: string; agentName: string };
export type AdminKnowledge = { id: string; agentId: string; workspaceId: string; title: string; content: string; sourceType: string; status: string; createdAt: string; updatedAt: string; agentName: string };
export type AdminTool = { name: string; description: string; agents: number; calls: number };
export type AdminActivity = { id: string; type: "usage" | "conversation" | "deployment"; workspaceId: string; agentId?: string; agentName?: string; description: string; status: string; createdAt: string };
export type AdminSettings = { creditMode: string; aiProvider: string; storage: string; adminUsers: number; corsOrigins: number };
