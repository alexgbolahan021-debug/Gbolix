import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminListProjects, useAdminUpdateProject, customFetch } from "@workspace/api-client-react";
import { getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Search, ChevronRight, Check, X, FileText, Info, FileSignature, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = { submitted: "bg-muted text-muted-foreground", pending_review: "bg-yellow-500/10 text-yellow-400", needs_info: "bg-orange-500/10 text-orange-400", approved: "bg-primary/10 text-primary", declined: "bg-destructive/10 text-destructive", agreement_sent: "bg-blue-500/10 text-blue-400", agreement_accepted: "bg-blue-500/10 text-blue-400", queued: "bg-blue-500/10 text-blue-400", in_progress: "bg-secondary/10 text-secondary", review: "bg-yellow-500/10 text-yellow-400", completed: "bg-primary/10 text-primary" };
const statusLabel: Record<string, string> = { submitted: "Submitted", pending_review: "Pending Review", needs_info: "Needs More Info", approved: "Approved", declined: "Declined", agreement_sent: "Agreement Sent", agreement_accepted: "Agreement Accepted", queued: "Queued", in_progress: "In Progress", review: "Review", completed: "Completed" };
const paymentStatusColor: Record<string, string> = { pending: "bg-yellow-500/10 text-yellow-400", paid: "bg-primary/10 text-primary", failed: "bg-destructive/10 text-destructive", cancelled: "bg-muted text-muted-foreground" };
const paymentStatusLabel: Record<string, string> = { pending: "Pending", paid: "Paid", failed: "Failed", cancelled: "Cancelled" };
const priorityColor: Record<string, string> = { low: "text-muted-foreground", medium: "text-blue-400", high: "text-yellow-400", urgent: "text-destructive" };
const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const apiUrl = (path: string) => apiBaseUrl ? `${apiBaseUrl}${apiBaseUrl.endsWith("/api") ? "" : "/api"}${path}` : `/api${path}`;

type AdminProject = { id: number; title: string; serviceType: string; description?: string | null; requirements?: any; status: string; paymentStatus?: string | null; priority: string; price?: number | null; internalNotes?: string | null; hasConversation: boolean; clientName: string; clientEmail: string; projectCode?: string | null; createdAt: string; };

export default function AdminProjects() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [viewingProject, setViewingProject] = useState<AdminProject | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [conversationDialog, setConversationDialog] = useState(false);
  const [offerDialog, setOfferDialog] = useState(false);
  const [offerProject, setOfferProject] = useState<AdminProject | null>(null);
  const [offerServiceType, setOfferServiceType] = useState("");
  const [offerServiceName, setOfferServiceName] = useState("");
  const [offerScope, setOfferScope] = useState("");
  const [offerRequirements, setOfferRequirements] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDelivery, setOfferDelivery] = useState("");
  const [offerTerms, setOfferTerms] = useState("");
  const [offerSaving, setOfferSaving] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = statusFilter !== "all" ? { status: statusFilter as any } : {};
  const { data: projects, isLoading } = useAdminListProjects(params, { query: { queryKey: getAdminListProjectsQueryKey(params) } });
  const updateMutation = useAdminUpdateProject();
  const filtered = (projects as AdminProject[] | undefined)?.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()) || p.serviceType.toLowerCase().includes(search.toLowerCase())) ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) });

  const openEdit = (p: AdminProject) => { setEditingProject(p); setEditStatus(p.status); setEditPriority(p.priority); setEditNotes(p.internalNotes ?? ""); };

  const handleUpdate = () => {
    if (!editingProject) return;
    updateMutation.mutate({ id: editingProject.id, data: { status: editStatus as any, priority: editPriority as any, internalNotes: editNotes } }, { onSuccess: () => { refresh(); setEditingProject(null); toast({ title: "Project updated" }); } });
  };

  const openOffer = (p: AdminProject) => {
    setOfferProject(p); setOfferServiceType(p.serviceType ?? ""); setOfferServiceName(p.title ?? ""); setOfferScope(p.description ?? "");
    setOfferRequirements(p.requirements && typeof p.requirements === "object" ? Object.entries(p.requirements).filter(([k]) => k !== "attached_files").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("\n") : p.requirements ?? "");
    setOfferPrice(p.price != null ? String(p.price) : ""); setOfferDelivery(""); setOfferTerms(""); setOfferDialog(true);
  };

  const handleReview = async (action: "approve" | "request_info" | "decline") => {
    if (!viewingProject) return;
    try {
      const data = await customFetch<{ status: string; hasConversation: boolean }>(apiUrl(`/admin/projects/${viewingProject.id}/review`), { method: "POST", responseType: "json", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      refresh();
      if (action === "decline") {
        setViewingProject(null);
        toast({ title: "Request declined", description: "The client has been notified. No conversation was opened." });
        return;
      }
      const updated = { ...viewingProject, status: data.status, hasConversation: data.hasConversation };
      setViewingProject(updated);
      toast({ title: action === "approve" ? "Request approved" : "More information requested", description: action === "request_info" ? "The client has been notified. Continue in the request chat to provide the specific details needed." : "The client has been notified. Create the offer for this request." });
      if (action === "approve") openOffer(updated);
      if (action === "request_info") setConversationDialog(true);
    } catch (error) {
      toast({ title: "Review failed", description: error instanceof Error ? error.message : "Unable to update request", variant: "destructive" });
    }
  };

  const sendOffer = async () => {
    if (!offerProject) return;
    if (!offerServiceType.trim() || !offerServiceName.trim() || !offerScope.trim() || !offerPrice.trim()) { toast({ title: "Missing offer details", description: "Service, project, scope and price are required.", variant: "destructive" }); return; }
    setOfferSaving(true);
    try {
      await customFetch<{ offer: any }>(apiUrl(`/projects/${offerProject.id}/offers`), { method: "POST", responseType: "json", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceType: offerServiceType.trim(), serviceName: offerServiceName.trim(), scope: offerScope.trim(), requirements: offerRequirements.trim() || undefined, price: offerPrice.trim(), deliveryEstimate: offerDelivery.trim() || undefined, terms: offerTerms.trim() || undefined, send: true }) });
      setOfferDialog(false); setViewingProject(null); setOfferProject(null); refresh(); toast({ title: "Offer sent", description: "The offer was saved and sent to this request's conversation." });
    } catch (error) { toast({ title: "Offer failed", description: error instanceof Error ? error.message : "Unable to send offer", variant: "destructive" }); } finally { setOfferSaving(false); }
  };

  const openConversation = () => { if (!viewingProject) return; setConversationDialog(false); window.location.href = `/admin/messages?project=${viewingProject.id}`; };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8"><div><h1 className="text-2xl font-bold">Projects</h1><p className="text-muted-foreground text-sm mt-1">Review and manage all client service requests.</p></div></div>
        <div className="flex flex-wrap gap-3 mb-6"><div className="relative flex-1 min-w-48 max-w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." className="pl-8 h-9 text-sm"/></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.entries(statusLabel).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-muted/30 animate-pulse rounded"/>)}</div> : !filtered.length ? <div className="py-16 text-center text-muted-foreground text-sm">No projects found.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Service</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payment</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th><th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20 cursor-pointer" onClick={()=>setViewingProject(p)}><td className="px-5 py-3"><p className="font-medium text-xs">{p.clientName}</p><p className="text-[11px] text-muted-foreground">{p.clientEmail}</p></td><td className="px-5 py-3"><p className="text-xs font-medium truncate max-w-[140px]">{p.title}</p><p className="text-[11px] text-muted-foreground">{p.serviceType}</p></td><td className="px-5 py-3"><Badge className={`text-[10px] ${statusColor[p.status]??"bg-muted text-muted-foreground"}`}>{statusLabel[p.status]??p.status}</Badge></td><td className="px-5 py-3">{p.paymentStatus?<Badge className={`text-[10px] ${paymentStatusColor[p.paymentStatus]??"bg-muted text-muted-foreground"}`}>{paymentStatusLabel[p.paymentStatus]??p.paymentStatus}</Badge>:<span className="text-xs text-muted-foreground">—</span>}</td><td className="px-5 py-3"><span className={`text-xs font-medium uppercase ${priorityColor[p.priority]}`}>{p.priority}</span></td><td className="px-5 py-3"><span className="text-primary font-medium text-xs">{p.price?`$${p.price}`:"—"}</span></td><td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDistanceToNow(new Date(p.createdAt),{addSuffix:true})}</td><td className="px-5 py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={e=>{e.stopPropagation();setViewingProject(p)}}><ChevronRight size={13}/> View</Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e=>{e.stopPropagation();openEdit(p)}}><Edit size={12}/></Button></div></td></tr>)}</tbody></table></div>}
        </div>

        <Dialog open={!!viewingProject} onOpenChange={()=>setViewingProject(null)}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Request Details</DialogTitle></DialogHeader>{viewingProject&&<div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-lg">{viewingProject.title}</h2><p className="text-sm text-muted-foreground">{viewingProject.clientName} · {viewingProject.clientEmail}</p><p className="text-xs text-muted-foreground mt-1">{viewingProject.projectCode??`Project #${viewingProject.id}`}</p></div><div className="flex flex-wrap items-center gap-2"><Badge className={statusColor[viewingProject.status]??"bg-muted text-muted-foreground"}>{statusLabel[viewingProject.status]??viewingProject.status}</Badge>{viewingProject.paymentStatus&&<Badge className={paymentStatusColor[viewingProject.paymentStatus]??"bg-muted text-muted-foreground"}>{paymentStatusLabel[viewingProject.paymentStatus]??viewingProject.paymentStatus}</Badge>}<span className="font-semibold text-primary">{viewingProject.price?`$${viewingProject.price}`:"—"}</span></div></div><div className="border-t border-border pt-5 space-y-4"><Detail label="Service" value={viewingProject.serviceType}/><Detail label="Request date" value={new Date(viewingProject.createdAt).toLocaleString()}/><Detail label="Complete requirements" value={formatRequirements(viewingProject.requirements,viewingProject.description)}/>{viewingProject.requirements?.attached_files?.length>0&&<div><p className="text-xs font-medium text-muted-foreground mb-1">Files</p><div className="space-y-1">{viewingProject.requirements.attached_files.map((name:string)=><div key={name} className="flex items-center gap-2 text-sm"><FileText size={14} className="text-primary"/>{name}</div>)}</div></div>}</div>{viewingProject.status==="pending_review"&&<div className="border-t border-border pt-5"><p className="text-sm font-semibold mb-3">Review request</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Button onClick={()=>handleReview("approve")} disabled={updateMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><Check size={15}/> Approve</Button><Button variant="outline" onClick={()=>handleReview("request_info")} disabled={updateMutation.isPending} className="gap-2"><Info size={15}/> Need More Information</Button><Button variant="outline" onClick={()=>handleReview("decline")} disabled={updateMutation.isPending} className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"><X size={15}/> Decline</Button></div></div>}{viewingProject.status==="approved"&&<Button onClick={()=>openOffer(viewingProject)} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><FileSignature size={15}/> Create Offer</Button>}{viewingProject.status==="needs_info"&&<div className="border-t border-border pt-5"><Button onClick={openConversation} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><MessageSquare size={15}/> Open Chat</Button></div>}</div>}</DialogContent></Dialog>

        <Dialog open={conversationDialog} onOpenChange={setConversationDialog}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Open Chat</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">The information request has been sent. Open the request chat to continue collecting the missing details from the client.</p><div className="flex gap-2 pt-2"><Button variant="outline" onClick={()=>setConversationDialog(false)} className="flex-1">Close</Button><Button onClick={openConversation} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><MessageSquare size={15}/> Open Chat</Button></div></DialogContent></Dialog>

        <Dialog open={offerDialog} onOpenChange={setOfferDialog}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Create Project Offer</DialogTitle></DialogHeader>{offerProject&&<div className="space-y-4"><div className="rounded-lg border border-border bg-muted/20 p-3 text-sm"><p className="font-medium">{offerProject.clientName}</p><p className="text-xs text-muted-foreground">{offerProject.projectCode??`Project #${offerProject.id}`} · {offerProject.title}</p><p className="text-xs text-muted-foreground mt-1">Original request: {offerProject.serviceType}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs font-medium mb-1.5 block">Service</label><Input value={offerServiceType} onChange={e=>setOfferServiceType(e.target.value)}/></div><div><label className="text-xs font-medium mb-1.5 block">Project / Service Name</label><Input value={offerServiceName} onChange={e=>setOfferServiceName(e.target.value)}/></div></div><div><label className="text-xs font-medium mb-1.5 block">Scope of Work</label><Textarea value={offerScope} onChange={e=>setOfferScope(e.target.value)} rows={5} placeholder="Describe exactly what will be delivered..."/></div><div><label className="text-xs font-medium mb-1.5 block">Requirements</label><Textarea value={offerRequirements} onChange={e=>setOfferRequirements(e.target.value)} rows={4} placeholder="Requirements and deliverables..."/></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="text-xs font-medium mb-1.5 block">Price (USD)</label><Input type="number" min="0" step="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)}/></div><div><label className="text-xs font-medium mb-1.5 block">Delivery Estimate</label><Input value={offerDelivery} onChange={e=>setOfferDelivery(e.target.value)} placeholder="e.g. 5 business days"/></div></div><div><label className="text-xs font-medium mb-1.5 block">Terms / Notes</label><Textarea value={offerTerms} onChange={e=>setOfferTerms(e.target.value)} rows={3} placeholder="Payment or project terms..."/></div><div className="flex gap-2 pt-2"><Button variant="outline" onClick={()=>setOfferDialog(false)} className="flex-1">Cancel</Button><Button onClick={sendOffer} disabled={offerSaving} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><FileSignature size={15}/>{offerSaving?"Sending...":"Send Offer"}</Button></div></div>}</DialogContent></Dialog>

        <Dialog open={!!editingProject} onOpenChange={()=>setEditingProject(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Update Project</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><label className="text-sm font-medium mb-1.5 block">Status</label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(statusLabel).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Priority</label><Select value={editPriority} onValueChange={setEditPriority}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Internal Notes</label><Textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Internal notes (not visible to client)..." rows={3}/></div><div className="flex gap-2 pt-2"><Button variant="outline" onClick={()=>setEditingProject(null)} className="flex-1">Cancel</Button><Button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">{updateMutation.isPending?"Saving...":"Save Changes"}</Button></div></div></DialogContent></Dialog>
      </div>
    </ClientLayout>
  );
}

function Detail({ label, value }: { label: string; value?: unknown }) { if (value === undefined || value === null || value === "") return null; return <div><p className="text-xs font-medium text-muted-foreground mb-1">{label}</p><p className="text-sm leading-6 whitespace-pre-wrap">{String(value)}</p></div>; }
function formatRequirements(req: any, description?: string) { if (!req || typeof req !== "object") return description ?? "Not provided"; const entries = Object.entries(req).filter(([k,v]) => k !== "attached_files" && v !== undefined && v !== null && v !== ""); if (!entries.length) return description ?? "Not provided"; return entries.map(([k,v]) => `${k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("\n\n"); }
