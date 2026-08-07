import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminListProjects, useAdminUpdateProject, useAdminStartConversation } from "@workspace/api-client-react";
import { getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Edit, Search, ChevronRight, Check, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = { submitted: "bg-muted text-muted-foreground", pending_review: "bg-yellow-500/10 text-yellow-400", queued: "bg-blue-500/10 text-blue-400", in_progress: "bg-secondary/10 text-secondary", review: "bg-yellow-500/10 text-yellow-400", completed: "bg-primary/10 text-primary" };
const statusLabel: Record<string, string> = { submitted: "Submitted", pending_review: "Pending Review", queued: "Queued", in_progress: "In Progress", review: "Review", completed: "Completed" };
const priorityColor: Record<string, string> = { low: "text-muted-foreground", medium: "text-blue-400", high: "text-yellow-400", urgent: "text-destructive" };

export default function AdminProjects() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [viewingProject, setViewingProject] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = statusFilter !== "all" ? { status: statusFilter as any } : {};
  const { data: projects, isLoading } = useAdminListProjects(params, { query: { queryKey: getAdminListProjectsQueryKey(params) } });
  const updateMutation = useAdminUpdateProject();
  const conversationMutation = useAdminStartConversation();

  const filtered = projects?.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()) || p.serviceType.toLowerCase().includes(search.toLowerCase())) ?? [];
  const openEdit = (p: any) => { setEditingProject(p); setEditStatus(p.status); setEditPriority(p.priority); setEditNotes(p.internalNotes ?? ""); };
  const handleUpdate = () => {
    if (!editingProject) return;
    updateMutation.mutate({ id: editingProject.id, data: { status: editStatus as any, priority: editPriority as any, internalNotes: editNotes } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) }); setEditingProject(null); toast({ title: "Project updated" }); } });
  };
  const handleStartConversation = (id: number) => {
    conversationMutation.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) }); setViewingProject(null); toast({ title: "Conversation started", description: "Client can now message on this project." }); } });
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8"><div><h1 className="text-2xl font-bold" data-testid="text-admin-projects-heading">Projects</h1><p className="text-muted-foreground text-sm mt-1">Review and manage all client service requests.</p></div></div>
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48 max-w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="pl-8 h-9 text-sm" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending_review">Pending Review</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="queued">Queued</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />)}</div> : !filtered.length ? <div className="py-16 text-center text-muted-foreground text-sm">No projects found.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Service</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priority</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th><th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th><th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th></tr></thead>
              <tbody>{filtered.map(p => <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20 cursor-pointer" onClick={() => setViewingProject(p)} data-testid={`row-admin-project-${p.id}`}>
                <td className="px-5 py-3"><p className="font-medium text-xs">{p.clientName}</p><p className="text-[11px] text-muted-foreground">{p.clientEmail}</p></td>
                <td className="px-5 py-3"><p className="text-xs font-medium truncate max-w-[140px]">{p.title}</p><p className="text-[11px] text-muted-foreground">{p.serviceType}</p></td>
                <td className="px-5 py-3"><Badge className={`text-[10px] ${statusColor[p.status]}`}>{statusLabel[p.status] ?? p.status}</Badge></td>
                <td className="px-5 py-3"><span className={`text-xs font-medium uppercase ${priorityColor[p.priority]}`}>{p.priority}</span></td>
                <td className="px-5 py-3"><span className="text-primary font-medium text-xs">{p.price ? `$${p.price}` : "—"}</span></td>
                <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</td>
                <td className="px-5 py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setViewingProject(p); }}><ChevronRight size={13} /> View</Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Edit size={12} /></Button></div></td>
              </tr>)}</tbody></table></div>
          )}
        </div>
      </div>

      <Dialog open={!!viewingProject} onOpenChange={() => setViewingProject(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-project-details">
          <DialogHeader><DialogTitle>Request Details</DialogTitle></DialogHeader>
          {viewingProject && <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-lg">{viewingProject.title}</h2><p className="text-sm text-muted-foreground">{viewingProject.clientName} · {viewingProject.clientEmail}</p><p className="text-xs text-muted-foreground mt-1">{viewingProject.projectCode ?? `Project #${viewingProject.id}`}</p></div><div className="flex items-center gap-2"><Badge className={statusColor[viewingProject.status]}>{statusLabel[viewingProject.status] ?? viewingProject.status}</Badge><span className="font-semibold text-primary">{viewingProject.price ? `$${viewingProject.price}` : "—"}</span></div></div>
            <div className="border-t border-border pt-5 space-y-4">
              <Detail label="Service" value={viewingProject.serviceType} />
              <Detail label="What would you like us to automate?" value={viewingProject.requirements?.automation_goal ?? viewingProject.description} />
              <Detail label="Current platform" value={viewingProject.requirements?.platform} />
              <Detail label="Current process" value={viewingProject.requirements?.current_process} />
              <Detail label="Desired outcomes" value={Array.isArray(viewingProject.requirements?.desired_outcomes) ? viewingProject.requirements.desired_outcomes.join(", ") : viewingProject.requirements?.desired_outcomes} />
              <Detail label="Accounts" value={accountLabel(viewingProject.requirements?.accounts_ready)} />
              {viewingProject.requirements?.attached_files?.length > 0 && <div><p className="text-xs font-medium text-muted-foreground mb-1">Files</p><div className="space-y-1">{viewingProject.requirements.attached_files.map((name: string) => <div key={name} className="flex items-center gap-2 text-sm"><FileText size={14} className="text-primary" />{name}</div>)}</div></div>}
              <Detail label="Additional notes" value={viewingProject.requirements?.additional_notes} />
            </div>
            <div className="border-t border-border pt-5 flex flex-col sm:flex-row gap-2">
              {!viewingProject.hasConversation && <Button onClick={() => handleStartConversation(viewingProject.id)} disabled={conversationMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"><MessageSquare size={14} />{conversationMutation.isPending ? "Starting..." : "Start Conversation"}</Button>}
              <Button variant="outline" onClick={() => { openEdit(viewingProject); setViewingProject(null); }} className="flex-1">Edit Request</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Update Project</DialogTitle></DialogHeader><div className="space-y-4 mt-2"><div><label className="text-sm font-medium mb-1.5 block">Status</label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending_review">Pending Review</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="queued">Queued</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Priority</label><Select value={editPriority} onValueChange={setEditPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Internal Notes</label><Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Internal notes (not visible to client)..." rows={3} /></div><div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setEditingProject(null)} className="flex-1">Cancel</Button><Button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button></div></div></DialogContent></Dialog>
    </ClientLayout>
  );
}

function Detail({ label, value }: { label: string; value?: unknown }) { if (value === undefined || value === null || value === "") return null; return <div><p className="text-xs font-medium text-muted-foreground mb-1">{label}</p><p className="text-sm leading-6 whitespace-pre-wrap">{String(value)}</p></div>; }
function accountLabel(value?: string) { const labels: Record<string, string> = { everything_ready: "Yes, everything is ready", some_ready: "I have some of the accounts", need_setup: "No, I need help setting them up", not_sure: "I'm not sure" }; return value ? labels[value] ?? value : "Not provided"; }
