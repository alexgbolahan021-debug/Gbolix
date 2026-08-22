import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, DatabaseZap, Download, Eye, Loader2, LockKeyhole, MessageCircle, SearchCheck, Sparkles } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toConfirmedChatDiscoveryRequest, toLeadRequestBody, type LeadChatProposal } from "@/lib/leadChatProposal";

type LeadRequest = {
  key: string;
  status: string;
  requestedLeadCount: number;
  processedLeads: number;
  qualifiedLeads: number;
  duplicatesSuppressed: number;
  resultSetKey: string | null;
  updatedAt: string;
};

type LeadsContext = {
  workspaceKey: string;
  product: { key: string; entitlementStatus: string };
  requests: LeadRequest[];
};

type LeadResult = {
  id: string;
  businessName: string;
  categoryCode: string | null;
  website: string | null;
  publicEmail: string | null;
  phone: string | null;
  city: string | null;
  score: number | null;
};

type LeadsResultsResponse = {
  job: { id: string; status: string; requestedCount: number; processedCount: number; qualifiedCount: number; duplicateCount: number; completedAt: string | null };
  leads: LeadResult[];
};

async function getLeads() {
  return customFetch<LeadsContext>("/api/leads", { responseType: "json" });
}

async function getLeadResults(requestKey: string) {
  return customFetch<LeadsResultsResponse>(`/api/leads/requests/${encodeURIComponent(requestKey)}/results`, { responseType: "json" });
}

async function createLeadChatProposal(message: string) {
  return customFetch<{ proposal: LeadChatProposal; pilot: { maximumLeads: number; attribution: string; confirmationRequired: boolean } }>("/api/leads/chat/proposal", { method: "POST", body: JSON.stringify({ message }), responseType: "json" });
}

function activityLabel(status: string, resultSetKey: string | null) {
  if (status === "completed") return resultSetKey ? "Results ready" : "Completed";
  if (status === "failed") return "Needs attention";
  if (status === "cancelled") return "Cancelled";
  return resultSetKey ? "Results ready" : "Processing";
}

export default function LeadsWorkspace() {
  const queryClient = useQueryClient();
  const leads = useQuery({ queryKey: ["gbolix-leads"], queryFn: getLeads });
  const [categoryCode, setCategoryCode] = useState("restaurants");
  const [city, setCity] = useState("");
  const [desiredLeadCount, setDesiredLeadCount] = useState(25);
  const [inputType, setInputType] = useState<"csv_upload" | "domain_list" | "openstreetmap_discovery">("domain_list");
  const [label, setLabel] = useState("My business list");
  const [rawContent, setRawContent] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatProposal, setChatProposal] = useState<LeadChatProposal | null>(null);
  const [planning, setPlanning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequestKey, setSelectedRequestKey] = useState<string | null>(null);
  const [exportingRequestKey, setExportingRequestKey] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["gbolix-lead-results", selectedRequestKey], queryFn: () => getLeadResults(selectedRequestKey!), enabled: Boolean(selectedRequestKey) });
  const active = leads.data?.product.entitlementStatus === "active" || leads.data?.product.entitlementStatus === "trialing";

  const startRequest = async (request: { categoryCode: string; desiredLeadCount: number; inputType: "csv_upload" | "domain_list" | "openstreetmap_discovery"; label: string; rawContent: string; city: string; keywords?: string[] }) => {
    setSubmitting(true);
    try {
      await customFetch("/api/leads/requests", {
        method: "POST",
        headers: { "Idempotency-Key": `web_${crypto.randomUUID()}` },
        body: JSON.stringify(request.inputType === "openstreetmap_discovery" ? toLeadRequestBody({ ...request, keywords: request.keywords ?? [] }) : { categoryCode: request.categoryCode, desiredLeadCount: request.desiredLeadCount, inputType: request.inputType, label: request.label, rawContent: request.rawContent, geography: request.city ? { cities: [request.city] } : {}, keywords: request.keywords ?? [] }),
        responseType: "json",
      });
      await queryClient.invalidateQueries({ queryKey: ["gbolix-leads"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-context"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the lead request");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!label.trim()) return setError("Provide a label before starting this request.");
    if (inputType !== "openstreetmap_discovery" && !rawContent.trim()) return setError("Provide a CSV or domain-list source before starting this request.");
    if (inputType === "openstreetmap_discovery" && !city.trim()) return setError("OpenStreetMap pilot discovery requires a city.");
    await startRequest({ categoryCode, desiredLeadCount, inputType, label, rawContent, city });
  };

  const planChatRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!chatMessage.trim()) return setError("Tell Gbolix what businesses you want to find.");
    setPlanning(true);
    try {
      const response = await createLeadChatProposal(chatMessage);
      setChatProposal(response.proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to understand this request right now.");
    } finally {
      setPlanning(false);
    }
  };

  const confirmChatProposal = async () => {
    if (!chatProposal) return;
    const request = toConfirmedChatDiscoveryRequest(chatProposal);
    if (!request) return;
    setError(null);
    await startRequest(request);
    setChatProposal(null);
    setChatMessage("");
  };

  const downloadCsv = async (requestKey: string) => {
    setError(null);
    setExportingRequestKey(requestKey);
    try {
      const exportResult = await customFetch<{ downloadUrl: string }>(`/api/leads/requests/${encodeURIComponent(requestKey)}/export`, { responseType: "json" });
      window.location.assign(exportResult.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the CSV export");
    } finally {
      setExportingRequestKey(null);
    }
  };

  return (
    <ClientLayout>
      <div className="mx-auto max-w-6xl p-5 md:p-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.10] via-card to-card p-6 md:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <Badge className="border-primary/25 bg-primary/15 text-primary">Gbolix product</Badge>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>Gbolix Leads</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Discover, verify, deduplicate, and score business leads. Gbolix controls access and credits; the Leads engine handles the intelligence pipeline.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Product access</p>
              <p className={`mt-1 text-sm font-bold ${active ? "text-primary" : "text-yellow-400"}`}>{active ? "Active" : "Credit purchase required"}</p>
            </div>
          </div>
        </div>

        {leads.isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : !active ? (
          <section className="mt-7 rounded-2xl border border-border bg-card p-7 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Activate Gbolix Leads with your wallet.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Credit packs unlock this workspace. Credits are shared with future team members, never expire, and are only consumed for qualified new leads.</p>
            <Link href="/dashboard/wallet"><Button className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90">Open Wallet <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </section>
        ) : (
          <>
            <section className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <form onSubmit={planChatRequest} className="rounded-2xl border border-primary/30 bg-card p-6 shadow-[0_20px_60px_-42px_hsl(var(--primary)/0.9)]">
                  <div className="flex items-center gap-2"><MessageCircle className="text-primary" size={18} /><h2 className="font-bold">Tell Gbolix what you need</h2></div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Write it naturally. For example: <span className="text-foreground">“Find 5 restaurants in Lagos that may need a new website.”</span></p>
                  <textarea className="mt-5 min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15" value={chatMessage} onChange={event => setChatMessage(event.target.value)} placeholder="I want five real-estate businesses in Abuja that I can contact about automation…" />
                  {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
                  <Button disabled={planning || submitting} className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">{planning ? "Understanding your request…" : "Create my lead plan"}<Sparkles className="ml-2 h-4 w-4" /></Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">Gbolix will show the plan and maximum credit reservation before starting anything.</p>
                </form>

                {chatProposal && <section className="mt-4 rounded-2xl border border-primary/35 bg-primary/[0.07] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Gbolix plan</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{chatProposal.reply}</p>
                  {chatProposal.kind === "proposal" && chatProposal.categoryCode && chatProposal.city && chatProposal.desiredLeadCount && chatProposal.label ? <>
                    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div className="rounded-lg bg-background/80 p-3"><p className="text-muted-foreground">Target</p><p className="mt-1 font-semibold capitalize">{chatProposal.categoryCode.replace("-", " ")}</p></div><div className="rounded-lg bg-background/80 p-3"><p className="text-muted-foreground">Location</p><p className="mt-1 font-semibold">{chatProposal.city}</p></div><div className="rounded-lg bg-background/80 p-3"><p className="text-muted-foreground">Maximum reservation</p><p className="mt-1 font-semibold">Up to {chatProposal.desiredLeadCount} credits</p></div></div>
                    {chatProposal.keywords.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Requested focus: <span className="font-medium text-foreground">{chatProposal.keywords.join(", ")}</span></p>}
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">This limited pilot uses public OpenStreetMap place records. It can return fewer than requested. Credits finalize only for new qualified leads; duplicates and unused capacity are released. Data © OpenStreetMap contributors.</p>
                    <div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={submitting} onClick={() => void confirmChatProposal()} className="bg-primary text-primary-foreground hover:bg-primary/90">{submitting ? "Starting job…" : `Confirm & reserve up to ${chatProposal.desiredLeadCount} credits`}<SearchCheck className="ml-2 h-4 w-4" /></Button><Button type="button" variant="outline" onClick={() => setChatProposal(null)}>Edit request</Button></div>
                  </> : <p className="mt-4 text-xs text-muted-foreground">Reply with the missing details and create another plan. Nothing has been reserved.</p>}
                </section>}

                <button type="button" onClick={() => setShowAdvanced(open => !open)} className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Advanced: import a domain list or CSV <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} /></button>
                {showAdvanced && <form onSubmit={submit} className="mt-3 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2"><DatabaseZap className="text-primary" size={17} /><h3 className="font-semibold">Import your own source</h3></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-muted-foreground">Source type<select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={inputType === "openstreetmap_discovery" ? "domain_list" : inputType} onChange={event => setInputType(event.target.value as "csv_upload" | "domain_list")}><option value="domain_list">Domain list</option><option value="csv_upload">CSV source</option></select></label><label className="text-xs font-semibold text-muted-foreground">Source label<input className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={label} onChange={event => setLabel(event.target.value)} /></label></div>
                  <textarea className="mt-3 min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs" value={rawContent} onChange={event => setRawContent(event.target.value)} placeholder={inputType === "csv_upload" ? "Company Name,Website,Email\nRiver House,river.example,hello@river.example" : "river.example\nshore.example"} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-muted-foreground">Category<select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={categoryCode} onChange={event => setCategoryCode(event.target.value)}><option value="restaurants">Restaurants</option><option value="real-estate">Real Estate</option></select></label><label className="text-xs font-semibold text-muted-foreground">City (optional)<input className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={city} onChange={event => setCity(event.target.value)} placeholder="Lagos" /></label><label className="text-xs font-semibold text-muted-foreground">Maximum leads<input className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" type="number" min={1} max={50000} value={desiredLeadCount} onChange={event => setDesiredLeadCount(Number(event.target.value))} /></label></div>
                  <Button disabled={submitting} className="mt-4 w-full" variant="outline">{submitting ? "Starting job…" : "Reserve credits & import source"}</Button>
                </form>}
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2"><Sparkles className="text-primary" size={18} /><h2 className="font-bold">What happens next</h2></div>
                <ol className="mt-5 space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span><span>Gbolix reserves the maximum requested credits in your workspace wallet.</span></li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span><span>Leads normalizes, deduplicates, verifies, and scores the eligible results.</span></li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span><span>Only qualified new leads finalize one credit each; unused reserved credits return to your wallet.</span></li>
                </ol>
              </div>
            </section>
            <section className="mt-8 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Workspace activity</p><h2 className="mt-1 text-xl font-bold">Lead jobs</h2></div>
                <Badge variant="outline">{leads.data?.workspaceKey}</Badge>
              </div>
              <div className="mt-5 divide-y divide-border">
                {!leads.data?.requests.length ? (
                  <p className="py-7 text-sm text-muted-foreground">No lead jobs yet. Start your first request above.</p>
                ) : leads.data.requests.map(job => (
                  <div key={job.key} className="grid gap-3 py-4 sm:grid-cols-[1.2fr_repeat(5,auto)] sm:items-center">
                    <div><p className="font-mono text-xs font-semibold">{job.key}</p><p className="mt-1 text-xs text-muted-foreground">Updated {new Date(job.updatedAt).toLocaleString()}</p></div>
                    <Badge className="w-fit bg-muted text-muted-foreground capitalize">{job.status.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{job.qualifiedLeads}/{job.requestedLeadCount} qualified</span>
                    <span className="text-xs text-muted-foreground">{job.duplicatesSuppressed} duplicates suppressed</span>
                    <span className="text-xs text-primary">{activityLabel(job.status, job.resultSetKey)}</span>
                    {job.status === "completed" && <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedRequestKey(job.key)}><Eye className="mr-1 h-3.5 w-3.5" />View</Button>
                      <Button type="button" size="sm" variant="outline" disabled={exportingRequestKey === job.key} onClick={() => void downloadCsv(job.key)}><Download className="mr-1 h-3.5 w-3.5" />{exportingRequestKey === job.key ? "Preparing…" : "CSV"}</Button>
                    </div>}
                  </div>
                ))}
              </div>
            </section>
            {selectedRequestKey && <section className="mt-6 rounded-2xl border border-primary/30 bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Completed request</p><h2 className="mt-1 text-xl font-bold">Lead results</h2></div><Button type="button" size="sm" variant="outline" onClick={() => setSelectedRequestKey(null)}>Close</Button></div>
              {results.isLoading ? <div className="flex h-36 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div> : results.isError ? <p className="mt-5 text-sm text-destructive">Unable to load results. Refresh and try again.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 pr-4">Business</th><th className="pb-3 pr-4">Website</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Phone</th><th className="pb-3 pr-4">City</th><th className="pb-3">Score</th></tr></thead><tbody>{results.data?.leads.length ? results.data.leads.map(lead => <tr key={lead.id} className="border-b border-border/60"><td className="py-3 pr-4 font-medium">{lead.businessName}</td><td className="py-3 pr-4 text-muted-foreground">{lead.website ?? "—"}</td><td className="py-3 pr-4 text-muted-foreground">{lead.publicEmail ?? "—"}</td><td className="py-3 pr-4 text-muted-foreground">{lead.phone ?? "—"}</td><td className="py-3 pr-4 text-muted-foreground">{lead.city ?? "—"}</td><td className="py-3 font-semibold text-primary">{lead.score ?? "—"}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No new qualified leads were created for this request.</td></tr>}</tbody></table></div>}
            </section>}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
