import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { ArrowLeft, BookOpen, Bot, CheckCircle2, ChevronRight, Code2, Copy, ExternalLink, LayoutDashboard, MessageSquare, Plus, Rocket, Settings2, Sparkles, Trash2, WalletCards, Zap } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientLayout } from "@/components/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { agentRequest, isAgentConfigured, type Agent, type Knowledge, type UsageSummary } from "@/lib/agentApi";

type WorkspaceView = "list" | "detail";
type DetailTab = "overview" | "configure" | "knowledge" | "playground" | "deploy";

type AgentForm = { name: string; description: string; instructions: string; tone: string; welcomeMessage: string; model: string; enabledTools: string[] };
type ChatItem = { role: "user" | "assistant"; content: string };
type WalletBalance = { availableCredits: number; reservedCredits: number; totalCredits: number; neverExpires: boolean };
type WalletContext = { wallet: WalletBalance };

const emptyAgentForm = (): AgentForm => ({ name: "", description: "", instructions: "", tone: "warm, concise, and helpful", welcomeMessage: "Hi! How can I help you today?", model: "gpt-5-mini", enabledTools: [] });
const detailTabs: Array<{ id: DetailTab; label: string; icon: typeof Bot }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "configure", label: "Configure", icon: Settings2 },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "playground", label: "Test agent", icon: MessageSquare },
  { id: "deploy", label: "Deploy", icon: Rocket },
];

export default function GbolixAIAgent() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<WorkspaceView>("list");
  const [tab, setTab] = useState<DetailTab>("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [usage, setUsage] = useState<UsageSummary>({ requests: 0, responses: 0, toolCalls: 0, creditsUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [form, setForm] = useState<AgentForm>(emptyAgentForm);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", content: "" });
  const [deployment, setDeployment] = useState<{ embedCode?: string; deployment?: { tokenPrefix: string } }>();
  const [websiteOrigin, setWebsiteOrigin] = useState("");
  const [walletBalance, setWalletBalance] = useState<WalletBalance>();

  async function loadWallet() {
    const result = await customFetch<WalletContext>("/api/wallet", { responseType: "json" });
    setWalletBalance(result.wallet);
  }

  const selected = useMemo(() => agents.find((agent) => agent.id === selectedId), [agents, selectedId]);

  async function loadAgents() {
    const token = await getToken();
    if (!token) throw new Error("Your Gbolix session is not ready yet.");
    setAgents(await agentRequest<Agent[]>(token, "/v1/agents"));
  }

  async function loadSelected(agentId: string) {
    const token = await getToken();
    if (!token) return;
    const [agent, knowledgeResult, usageResult] = await Promise.all([
      agentRequest<Agent>(token, `/v1/agents/${agentId}`),
      agentRequest<Knowledge[]>(token, `/v1/agents/${agentId}/knowledge`),
      agentRequest<{ summary: UsageSummary }>(token, `/v1/agents/${agentId}/usage`),
    ]);
    setForm({ name: agent.name, description: agent.description, instructions: agent.instructions, tone: agent.tone, welcomeMessage: agent.welcomeMessage, model: agent.model, enabledTools: agent.enabledTools });
    setKnowledge(knowledgeResult);
    setUsage(usageResult.summary);
  }

  useEffect(() => {
    if (!isAgentConfigured()) { setLoading(false); return; }
    loadAgents().catch((error) => toast({ title: "Unable to load AI Agents", description: error.message, variant: "destructive" })).finally(() => setLoading(false));
    loadWallet().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selectedId) loadSelected(selectedId).catch((error) => toast({ title: "Unable to load agent", description: error.message, variant: "destructive" }));
  }, [selectedId]);

  function startNewAgent() {
    setSelectedId(undefined);
    setWebsiteOrigin("");
    setForm(emptyAgentForm());
    setKnowledge([]);
    setUsage({ requests: 0, responses: 0, toolCalls: 0, creditsUsed: 0 });
    setDeployment(undefined);
    setChat([]);
    setConversationId(undefined);
    setTab("configure");
    setView("detail");
  }

  function openAgent(agentId: string) {
    setSelectedId(agentId);
    setTab("overview");
    setView("detail");
    setChat([]);
    setConversationId(undefined);
    setDeployment(undefined);
    setWebsiteOrigin("");
  }

  function backToAgents() {
    setView("list");
    setTab("overview");
  }

  function goTo(tabId: DetailTab) {
    if (!selected) return;
    setTab(tabId);
  }

  async function createAgent() {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");
      const created = await agentRequest<Agent>(token, "/v1/agents", { method: "POST", body: JSON.stringify({ name: form.name || "New Gbolix Agent", description: form.description, instructions: form.instructions || "Help customers using the business information provided.", tone: form.tone, welcomeMessage: form.welcomeMessage, model: form.model, status: "draft", enabledTools: form.enabledTools }) });
      setAgents((current) => [created, ...current]);
      setSelectedId(created.id);
      setTab("overview");
      setView("detail");
      toast({ title: "Agent created", description: "Next, add knowledge, test the agent, and deploy it." });
    } catch (error) {
      toast({ title: "Could not create agent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function saveAgent() {
    if (!selected) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");
      const updated = await agentRequest<Agent>(token, `/v1/agents/${selected.id}`, { method: "PATCH", body: JSON.stringify({ ...form }) });
      setAgents((current) => current.map((agent) => agent.id === updated.id ? updated : agent));
      toast({ title: "Agent saved", description: "Your configuration has been updated." });
      setTab("overview");
    } catch (error) {
      toast({ title: "Could not save agent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function addKnowledge() {
    if (!selected || !knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");
      const created = await agentRequest<Knowledge>(token, `/v1/agents/${selected.id}/knowledge`, { method: "POST", body: JSON.stringify(knowledgeForm) });
      setKnowledge((current) => [created, ...current]);
      setKnowledgeForm({ title: "", content: "" });
      toast({ title: "Knowledge added", description: "The agent can use it in its next conversation." });
    } catch (error) {
      toast({ title: "Could not add knowledge", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function removeKnowledge(id: string) {
    const token = await getToken();
    if (!token || !selected) return;
    try {
      await agentRequest<void>(token, `/v1/agents/${selected.id}/knowledge/${id}`, { method: "DELETE" });
      setKnowledge((current) => current.filter((item) => item.id !== id));
    } catch (error) { toast({ title: "Could not remove knowledge", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); }
  }

  async function sendMessage() {
    if (!selected || !message.trim()) return;
    const text = message.trim();
    setMessage("");
    setChat((current) => [...current, { role: "user", content: text }]);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");
      const result = await agentRequest<{ conversationId: string; response: string }>(token, `/v1/agents/${selected.id}/messages`, { method: "POST", body: JSON.stringify({ message: text, conversationId, channel: "playground" }) });
      setConversationId(result.conversationId);
      setChat((current) => [...current, { role: "assistant", content: result.response }]);
      setUsage((current) => ({ ...current, requests: current.requests + 1, responses: current.responses + 1, creditsUsed: current.creditsUsed + 1 }));
      loadWallet().catch(() => undefined);
    } catch (error) { setChat((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "The agent could not respond." }]); }
  }

  async function deploy() {
    if (!selected) return;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");
      const result = await agentRequest<{ embedCode: string; deployment: { tokenPrefix: string } }>(token, `/v1/agents/${selected.id}/deployments`, { method: "POST", body: JSON.stringify({ allowedOrigin: websiteOrigin.trim() }) });
      setDeployment(result);
      toast({ title: "Website installation ready", description: "Copy the snippet into your website." });
    } catch (error) { toast({ title: "Could not create deployment", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }); } finally { setBusy(false); }
  }

  const shell = (content: ReactNode) => <ClientLayout><div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{content}</div></ClientLayout>;
  if (!isAgentConfigured()) return shell(<EmptyState title="Connect your AI Agent engine" description="Set VITE_GBOLIX_AGENT_URL in the Gbolix site environment to connect this workspace to the standalone engine." />);
  if (loading) return shell(<div className="space-y-4"><div className="h-10 w-56 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded-xl bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>);

  if (view === "list") return shell(<AgentList agents={agents} wallet={walletBalance} onNew={startNewAgent} onOpen={openAgent} />);
  return shell(<AgentDetail agent={selected} wallet={walletBalance} tab={tab} setTab={setTab} onBack={backToAgents} onNew={startNewAgent} form={form} setForm={setForm} knowledge={knowledge} knowledgeForm={knowledgeForm} setKnowledgeForm={setKnowledgeForm} usage={usage} chat={chat} message={message} setMessage={setMessage} deployment={deployment} websiteOrigin={websiteOrigin} setWebsiteOrigin={setWebsiteOrigin} onCreate={createAgent} onSave={saveAgent} onAddKnowledge={addKnowledge} onRemoveKnowledge={removeKnowledge} onSend={sendMessage} onResetChat={() => { setChat([]); setConversationId(undefined); }} onDeploy={deploy} busy={busy} goTo={goTo} />);
}

function AgentList({ agents, wallet, onNew, onOpen }: { agents: Agent[]; wallet?: WalletBalance; onNew: () => void; onOpen: (id: string) => void }) {
  const active = agents.filter((agent) => agent.status === "active").length;
  return <div className="space-y-7">
    <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles size={14} /> Gbolix AI Agent</div><h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>Your AI agents</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create and manage digital workers for your business. Choose an agent to open its workspace.</p></div><div className="flex flex-wrap items-center gap-3 self-start"><CreditPill wallet={wallet} /><Button className="gap-2 font-semibold" style={{ background: "linear-gradient(135deg,#00FF66,#00cc52)", color: "#0B0F14" }} onClick={onNew}><Plus size={16} /> Create new agent</Button></div></header>
    <div className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Total agents" value={agents.length} icon={Bot} /><SummaryCard label="Active agents" value={active} icon={CheckCircle2} /><SummaryCard label="Next step" value={agents.length ? "Open an agent" : "Create one"} icon={Rocket} compact /></div>
    {!agents.length ? <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center md:p-14"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={28} /></div><h2 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Create your first AI agent</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your agent can answer customer questions, use your approved tools, and be added to your website.</p><Button onClick={onNew} className="mt-6 gap-2"><Plus size={15} /> Create my first agent</Button></div> : <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>All agents</h2><p className="mt-1 text-xs text-muted-foreground">Click any agent to view its overview and manage it.</p></div><button onClick={onNew} className="text-xs font-bold text-primary hover:underline">+ Add another agent</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <AgentCard key={agent.id} agent={agent} onOpen={() => onOpen(agent.id)} />)}</div></section>}
  </div>;
}

function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: () => void }) { return <button onClick={onOpen} className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"><div className="mb-5 flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={21} /></div><Badge className={agent.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>{agent.status}</Badge></div><h3 className="text-base font-bold">{agent.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{agent.description || "No description yet. Open this agent to finish setup."}</p><div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4 text-xs font-semibold text-muted-foreground"><span>Open workspace</span><ChevronRight size={15} className="text-primary transition group-hover:translate-x-1" /></div></button> }

function AgentDetail({ agent, wallet, tab, setTab, onBack, onNew, form, setForm, knowledge, knowledgeForm, setKnowledgeForm, usage, chat, message, setMessage, deployment, websiteOrigin, setWebsiteOrigin, onCreate, onSave, onAddKnowledge, onRemoveKnowledge, onSend, onResetChat, onDeploy, busy, goTo }: any) {
  const creating = !agent;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft size={16} /> All agents</button><div className="flex flex-wrap items-center gap-3"><CreditPill wallet={wallet} /><Button variant="outline" size="sm" className="gap-2" onClick={onNew}><Plus size={14} /> New agent</Button></div></div>
    <header className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={23} /></div><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles size={13} /> Agent workspace</div><h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>{creating ? "Create a new agent" : agent.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{creating ? "Set up your agent, then add knowledge and deploy it." : agent.description || "Manage this agent's configuration, knowledge, testing, and deployment."}</p></div></div>{!creating && <Badge className={agent.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>{agent.status}</Badge>}</div></header>
    {!creating && <div className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2">{detailTabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Icon size={14} />{label}</button>)}</div>}
    {creating ? <AgentEditor creating form={form} setForm={setForm} onCreate={onCreate} busy={busy} /> : tab === "overview" ? <AgentOverview agent={agent} knowledgeCount={knowledge.length} usage={usage} goTo={goTo} /> : tab === "configure" ? <AgentEditor form={form} setForm={setForm} onSave={onSave} busy={busy} /> : tab === "knowledge" ? <KnowledgePanel selected={agent} knowledge={knowledge} form={knowledgeForm} setForm={setKnowledgeForm} onAdd={onAddKnowledge} onRemove={onRemoveKnowledge} busy={busy} /> : tab === "playground" ? <Playground selected={agent} chat={chat} message={message} setMessage={setMessage} onSend={onSend} onReset={onResetChat} /> : <DeployPanel selected={agent} deployment={deployment} websiteOrigin={websiteOrigin} setWebsiteOrigin={setWebsiteOrigin} onDeploy={onDeploy} busy={busy} />}
  </div>;
}

function AgentOverview({ agent, knowledgeCount, usage, goTo }: { agent: Agent; knowledgeCount: number; usage: UsageSummary; goTo: (tab: DetailTab) => void }) { const steps = [{ title: "Configure your agent", description: "Update its name, tone, instructions, and approved tools.", tab: "configure" as DetailTab, done: Boolean(agent.instructions) }, { title: "Add business knowledge", description: "Give it FAQs, products, policies, and other trusted information.", tab: "knowledge" as DetailTab, done: knowledgeCount > 0 }, { title: "Test the agent", description: "Ask real customer questions before making it available publicly.", tab: "playground" as DetailTab, done: usage.responses > 0 }, { title: "Deploy to your website", description: "Generate an installation snippet when the agent is ready.", tab: "deploy" as DetailTab, done: false }]; return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Knowledge sources" value={knowledgeCount} icon={BookOpen} /><SummaryCard label="AI responses" value={usage.responses} icon={MessageSquare} /><SummaryCard label="Tool calls" value={usage.toolCalls} icon={Zap} /><SummaryCard label="Credits used" value={usage.creditsUsed} icon={Rocket} /></div><div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5"><h2 className="text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Finish setting up {agent.name}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Follow these steps in order. You can return here whenever you want to edit this agent.</p></div><div className="space-y-3">{steps.map((step, index) => <button key={step.title} onClick={() => goTo(step.tab)} className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{step.done ? <CheckCircle2 size={17} /> : <span className="text-sm font-bold">{index + 1}</span>}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p></div><ChevronRight size={16} className="shrink-0 text-muted-foreground" /></button>)}</div></section><section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6"><div className="mb-5 flex items-center gap-2"><Bot size={17} className="text-primary" /><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Agent details</h2></div><div className="space-y-4 text-sm"><DetailRow label="Status" value={agent.status} /><DetailRow label="Tone" value={agent.tone || "Not set"} /><DetailRow label="Tools" value={agent.enabledTools.length ? `${agent.enabledTools.length} approved` : "None enabled"} /><DetailRow label="Created" value={new Date(agent.createdAt).toLocaleDateString()} /></div><Button variant="outline" className="mt-6 w-full gap-2" onClick={() => goTo("configure")}><Settings2 size={14} /> Edit agent</Button></section></div></div> }

function AgentEditor({ creating = false, form, setForm, onCreate, onSave, busy }: any) { const editing = !creating && Boolean(onSave); const set = (key: string, value: string) => setForm((current: AgentForm) => ({ ...current, [key]: value })); return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7"><div className="mb-7 max-w-2xl"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Settings2 size={14} /> {creating ? "Step 1 · Create agent" : "Agent configuration"}</div><h2 className="text-xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{creating ? "Tell us about your AI worker" : "Edit how your agent works"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{creating ? "After you create it, you will be taken to its overview where you can add knowledge, test it, and deploy it." : "Change these settings anytime. Your existing knowledge and deployment remain attached to this agent."}</p></div><div className="grid gap-4 md:grid-cols-2"><Field label="Agent name" value={form.name} onChange={(value: string) => set("name", value)} placeholder="Gbolix Assistant" /><Field label="Short description" value={form.description} onChange={(value: string) => set("description", value)} placeholder="Answers customer questions" /><Field label="Tone" value={form.tone} onChange={(value: string) => set("tone", value)} placeholder="Warm, concise, professional" /></div><label className="mt-5 block text-xs font-semibold text-muted-foreground">Instructions<textarea value={form.instructions} onChange={(event) => set("instructions", event.target.value)} className="mt-2 min-h-36 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2" placeholder="Tell the agent what it should do and what it must not invent..." /></label><label className="mt-5 block text-xs font-semibold text-muted-foreground">Welcome message<input value={form.welcomeMessage} onChange={(event) => set("welcomeMessage", event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2" /></label><div className="mt-5 rounded-xl border border-border/70 bg-background/60 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Zap size={15} className="text-primary" /> Approved tools</div><div className="flex flex-wrap gap-2">{["capture_contact", "create_lead"].map((tool) => <button key={tool} type="button" onClick={() => setForm((current: AgentForm) => ({ ...current, enabledTools: current.enabledTools.includes(tool) ? current.enabledTools.filter((item) => item !== tool) : [...current.enabledTools, tool] }))} className={`rounded-full border px-3 py-1.5 text-xs ${form.enabledTools.includes(tool) ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{form.enabledTools.includes(tool) ? "Enabled · " : "Enable · "}{tool.replace("_", " ")}</button>)}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Tools are optional. Enable them only when you want the agent to perform that action.</p></div><div className="mt-7 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={() => setForm(emptyAgentForm())}>Clear</Button><Button disabled={busy} onClick={editing ? onSave : onCreate} className="gap-2">{editing ? <Settings2 size={14} /> : <Plus size={14} />}{editing ? "Save changes" : "Create agent"}</Button></div></div> }

function KnowledgePanel({ selected, knowledge, form, setForm, onAdd, onRemove, busy }: any) { if (!selected) return <EmptyState title="Select an agent first" description="Create or select an agent before adding business knowledge." />; return <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center gap-2"><BookOpen size={18} className="text-primary" /><div><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Add business knowledge</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Add FAQs, products, policies, pricing, or delivery information.</p></div></div><Field label="Knowledge title" value={form.title} onChange={(value: string) => setForm((current: any) => ({ ...current, title: value }))} placeholder="Delivery policy" /><label className="mt-4 block text-xs font-semibold text-muted-foreground">Content<textarea value={form.content} onChange={(event) => setForm((current: any) => ({ ...current, content: event.target.value }))} className="mt-2 min-h-52 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2" placeholder="Delivery to Lagos starts from..." /></label><Button disabled={busy || !form.title.trim() || !form.content.trim()} onClick={onAdd} className="mt-4 gap-2"><Plus size={14} /> Add knowledge</Button></section><section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Knowledge for {selected.name}</h2><p className="mt-1 text-xs text-muted-foreground">{knowledge.length} source{knowledge.length === 1 ? "" : "s"} available.</p></div><BookOpen size={18} className="text-secondary" /></div>{!knowledge.length ? <EmptyState title="No knowledge yet" description="Add the business facts this agent should use when answering customers." /> : <div className="space-y-3">{knowledge.map((item: Knowledge) => <div key={item.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.content}</p></div><button onClick={() => onRemove(item.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></div>)}</div>}</section></div> }

function Playground({ selected, chat, message, setMessage, onSend, onReset }: any) { if (!selected) return <EmptyState title="Select an agent first" description="Create or select an agent before opening the playground." />; return <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-card to-primary/5 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot size={18} /></div><div><p className="text-sm font-bold">Test {selected.name}</p><p className="text-xs text-muted-foreground">Private playground · {selected.status}</p></div></div><Button variant="ghost" size="sm" onClick={onReset} className="text-xs">New conversation</Button></div><div className="min-h-[420px] space-y-4 bg-background/40 p-5">{!chat.length && <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles size={24} /></div><h2 className="text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>See your agent in action</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Ask a real customer question and check whether the answer matches your business knowledge.</p></div>}{chat.map((item: ChatItem, index: number) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card"}`}>{item.content}</div></div>)}</div><div className="border-t border-border p-4"><form onSubmit={(event) => { event.preventDefault(); onSend(); }} className="flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2" placeholder="Ask a customer question..." /><Button type="submit" className="h-11 px-5">Send</Button></form></div></div> }

function DeployPanel({ selected, deployment, websiteOrigin, setWebsiteOrigin, onDeploy, busy }: any) { if (!selected) return <EmptyState title="Select an agent first" description="Create or select an agent before deploying." />; return <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center gap-2"><Rocket size={18} className="text-primary" /><div><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Deploy {selected.name}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Connect this agent to the website where customers should use it.</p></div></div><div className="space-y-3 text-sm"><div className="flex items-center gap-3 rounded-lg border border-border/70 p-3"><Code2 size={16} className="text-secondary" /><span>Website installation</span><Badge className="ml-auto bg-primary/10 text-primary">Available</Badge></div><div className="flex items-center gap-3 rounded-lg border border-border/70 p-3 opacity-60"><ExternalLink size={16} /><span>Developer API</span><Badge className="ml-auto bg-muted text-muted-foreground">Available</Badge></div></div><label className="mt-6 block text-xs font-semibold text-muted-foreground">Website address<input value={websiteOrigin} onChange={(event) => setWebsiteOrigin(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none ring-primary/30 focus:ring-2" placeholder="https://clientwebsite.com" /><span className="mt-2 block text-[11px] font-normal leading-5 text-muted-foreground">Enter the website origin only, without a page path. Example: https://clientwebsite.com</span></label><Button disabled={busy || !websiteOrigin.trim()} onClick={onDeploy} className="mt-4 w-full gap-2"><Rocket size={14} /> Generate installation code</Button></section><section className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Website installation</h2>{deployment?.embedCode ? <><p className="mt-2 text-sm leading-6 text-muted-foreground">Copy this code into the website where you want the agent to appear. Generate again whenever you need a new deployment token.</p><div className="mt-5 rounded-lg border border-border bg-[#0B0F14] p-4"><code className="block break-all text-xs leading-6 text-primary">{deployment.embedCode}</code></div><Button variant="outline" className="mt-4 gap-2 text-xs" onClick={() => navigator.clipboard.writeText(deployment.embedCode)}><Copy size={14} /> Copy installation code</Button><p className="mt-5 text-xs text-muted-foreground">Deployment token: <span className="font-mono text-foreground">{deployment.deployment?.tokenPrefix}</span>. Keep the full token private.</p></> : <EmptyState title="Not deployed yet" description="Generate an installation code when the agent is ready." />}</section></div> }

function CreditPill({ wallet }: { wallet?: WalletBalance }) { return <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2"><WalletCards size={16} className="text-primary" /><div className="leading-tight"><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Available credits</p><p className="text-sm font-extrabold">{wallet ? wallet.availableCredits.toLocaleString() : "—"}</p></div><button type="button" onClick={() => window.location.assign("/dashboard/wallet")} className="ml-1 text-[11px] font-bold text-primary hover:underline">Wallet</button></div>; }
function SummaryCard({ label, value, icon: Icon, compact = false }: { label: string; value: number | string; icon: typeof Bot; compact?: boolean }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={15} /></div></div><div className={`${compact ? "text-lg" : "text-3xl"} font-extrabold`} style={{ fontFamily: "Sora, sans-serif" }}>{value}</div></div> }
function DetailRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right text-xs font-semibold capitalize">{value}</span></div> }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block text-xs font-semibold text-muted-foreground">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none ring-primary/30 focus:ring-2" /></label>; }
function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={20} /></div><h2 className="text-base font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }
