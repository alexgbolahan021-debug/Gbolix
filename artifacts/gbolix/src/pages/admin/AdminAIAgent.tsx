import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Activity, Bot, Building2, Coins, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { agentRequest, isAgentConfigured } from "@/lib/agentApi";
import { useToast } from "@/hooks/use-toast";

type Overview = { customers: number; agents: number; responses: number; creditsUsed: number; deployments?: number };
type Customer = { workspaceId: string; agents: number; responses: number; creditsUsed: number };

export default function AdminAIAgent() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = await getToken();
    if (!token) throw new Error("Authentication token unavailable");
    const [global, customerRows] = await Promise.all([
      agentRequest<Overview>(token, "/v1/admin/overview"),
      agentRequest<Customer[]>(token, "/v1/admin/customers?limit=100"),
    ]);
    setOverview(global); setCustomers(customerRows);
  }

  useEffect(() => { if (!isAgentConfigured()) { setLoading(false); return; } load().catch((error) => toast({ title: "Unable to load AI Agent admin data", description: error.message, variant: "destructive" })).finally(() => setLoading(false)); }, []);
  const cards = [{ label: "Customers", value: overview?.customers ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" }, { label: "Active agents", value: overview?.agents ?? 0, icon: Bot, color: "text-secondary", bg: "bg-secondary/10" }, { label: "AI responses", value: overview?.responses ?? 0, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10" }, { label: "Credits used", value: overview?.creditsUsed ?? 0, icon: Coins, color: "text-yellow-400", bg: "bg-yellow-400/10" }];
  return <ClientLayout><div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8"><header className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary"><ShieldCheck size={14} /> Admin control center</div><h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>Gbolix AI Agent</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Global visibility across customers, agents, conversations, deployments, and credit consumption.</p></div><Button variant="outline" className="gap-2 self-start text-xs" onClick={() => load().catch((error) => toast({ title: "Refresh failed", description: error.message, variant: "destructive" }))}><RefreshCw size={14} /> Refresh data</Button></header>{!isAgentConfigured() ? <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><Bot className="mx-auto mb-4 text-primary" /><h2 className="font-bold">Connect the AI Agent engine</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Set VITE_GBOLIX_AGENT_URL on the site deployment to enable the admin workspace.</p></div> : loading ? <div className="space-y-4"><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-72 animate-pulse rounded-xl bg-muted" /></div> : <><div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</span><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}><card.icon size={15} className={card.color} /></div></div><div className="text-3xl font-extrabold" style={{ fontFamily: "Sora, sans-serif" }}>{card.value.toLocaleString()}</div></div>)}</div><div className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="rounded-xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Customers using AI Agent</h2><p className="mt-1 text-xs text-muted-foreground">Tenant-level usage without exposing global data to customers.</p></div><Building2 size={18} className="text-primary" /></div>{!customers.length ? <p className="py-10 text-center text-sm text-muted-foreground">No usage has been recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><th className="pb-3">Workspace</th><th className="pb-3">Agents</th><th className="pb-3">Responses</th><th className="pb-3">Credits</th><th className="pb-3">Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.workspaceId} className="border-b border-border/60 last:border-0"><td className="py-3 font-mono text-xs">{customer.workspaceId}</td><td className="py-3">{customer.agents}</td><td className="py-3">{customer.responses.toLocaleString()}</td><td className="py-3">{customer.creditsUsed.toLocaleString()}</td><td className="py-3"><Badge className="bg-primary/10 text-primary">Active</Badge></td></tr>)}</tbody></table></div>}</div><div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-secondary/5 p-6"><div className="mb-5 flex items-center gap-2"><Activity size={17} className="text-secondary" /><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Operational guardrails</h2></div><div className="space-y-3">{["Tenant-scoped data access", "Credit events are idempotent", "Failed responses consume zero credits", "Deployments can be revoked", "Tools are opt-in per agent", "Human handoff is recorded"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/30 p-3 text-xs"><span className="h-2 w-2 rounded-full bg-primary" />{item}</div>)}</div><p className="mt-5 text-xs leading-5 text-muted-foreground">This admin view is intended for owner/admin roles only. Customer workspaces only receive their own agent and usage records.</p></div></div></>}</div></ClientLayout>;
}
