export type AgentLevel = 1 | 2 | 3;
export type Agent = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  instructions: string;
  tone: string;
  model: string;
  level: AgentLevel;
  status: "draft" | "active" | "paused" | "disabled";
  welcomeMessage: string;
  enabledTools: string[];
  createdAt: string;
  updatedAt: string;
};

export type Knowledge = { id: string; agentId: string; workspaceId: string; title: string; content: string; sourceType: string; status: string; createdAt: string; };
export type AgentPlan = { level: AgentLevel; name: string; tagline: string; price: string; billing: string; credits: number; features: string[]; accent: "muted" | "green" | "violet" };
export const AGENT_CAPABILITIES: Record<AgentLevel, { knowledge: boolean; tools: boolean; api: boolean; deployment: boolean }> = {
  1: { knowledge: false, tools: false, api: false, deployment: true },
  2: { knowledge: true, tools: false, api: false, deployment: true },
  3: { knowledge: true, tools: true, api: true, deployment: true },
};

export type ApprovedAction = { key: string; name: string; description: string; example: string };
export const APPROVED_ACTIONS: ApprovedAction[] = [
  { key: "capture_contact", name: "Capture contact details", description: "Save a visitor's name, email, phone number, and follow-up note.", example: "Collect a visitor's details when they ask for a callback." },
  { key: "create_lead", name: "Create a qualified lead", description: "Turn a buying or partnership conversation into a structured lead for the business.", example: "Create a lead when a visitor is ready to speak with sales." },
];
export const AGENT_PLANS: AgentPlan[] = [
  { level: 1, name: "AI Assistant", tagline: "Try the AI", price: "Free", billing: "No subscription required", credits: 0, features: ["Basic AI conversation", "Basic agent instructions", "Website deployment/widget", "Customer conversations", "Uses your Gbolix Wallet credits"], accent: "muted" },
  { level: 2, name: "AI Knowledge Agent", tagline: "Give the AI knowledge", price: "$15", billing: "per month", credits: 5000, features: ["Everything in Level 1", "Business knowledge base", "Upload documents and files", "Website and business information", "Advanced agent configuration", "5,000 Gbolix Credits every month"], accent: "green" },
  { level: 3, name: "AI Action Agent", tagline: "Give the AI the ability to act", price: "$30", billing: "per month", credits: 15000, features: ["Everything in Level 2", "Approved Actions panel", "Capture contacts and create leads", "Business actions and automations", "Developer API access", "15,000 Gbolix Credits every month"], accent: "violet" },
];
export type UsageSummary = { requests: number; responses: number; failed?: number; toolCalls: number; creditsUsed: number; conversations?: number; resolved?: number; handoffs?: number; open?: number };
export type Conversation = { id: string; agentId: string; workspaceId: string; channel: string; visitorKey: string; status: string; createdAt: string; updatedAt: string };
export type ConversationMessage = { id: string; conversationId: string; role: string; content: string; toolName?: string; createdAt: string };
export type Deployment = { id: string; agentId: string; workspaceId: string; channel: string; allowedOrigin?: string; tokenPrefix: string; status: string; createdAt: string; updatedAt: string };
export type ApiKey = { id: string; agentId: string; workspaceId: string; keyPrefix: string; status: string; createdAt: string; lastUsedAt?: string };
export type AgentConnection = { id: string; agentId: string; workspaceId: string; kind: "native" | "custom_api"; provider: string; name: string; endpoint?: string; method?: string; authType?: string; status: string; permissions: string[]; createdAt: string; updatedAt: string };
export type AgentVersion = { id: string; agentId: string; workspaceId: string; version: number; config: Pick<Agent, "name" | "description" | "instructions" | "tone" | "model" | "level" | "status" | "welcomeMessage" | "enabledTools">; createdBy: string; createdAt: string };
export type WalletLedgerEntry = { id: string; type: string; credits: number; sourceType: string; sourceKey: string; metadata?: Record<string, unknown>; createdAt: string };
export type WorkspaceActivity = { id: string; type: string; description: string; status: string; agentId?: string; agentName?: string; createdAt: string };

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
