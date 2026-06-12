import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAdminListProjects,
  useAdminUpdateProject,
  useAdminStartConversation,
} from "@workspace/api-client-react";
import { getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Edit, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  processing: "bg-secondary/10 text-secondary",
  testing: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const priorityColor: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-400",
  high: "text-yellow-400",
  urgent: "text-destructive",
};

export default function AdminProjects() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = statusFilter !== "all" ? { status: statusFilter as any } : {};
  const { data: projects, isLoading } = useAdminListProjects(params, {
    query: { queryKey: getAdminListProjectsQueryKey(params) },
  });

  const updateMutation = useAdminUpdateProject();
  const conversationMutation = useAdminStartConversation();

  const filtered = projects?.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName.toLowerCase().includes(search.toLowerCase()) ||
    p.serviceType.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const openEdit = (p: any) => {
    setEditingProject(p);
    setEditStatus(p.status);
    setEditPriority(p.priority);
    setEditNotes(p.internalNotes ?? "");
  };

  const handleUpdate = () => {
    if (!editingProject) return;
    updateMutation.mutate(
      {
        id: editingProject.id,
        data: { status: editStatus as any, priority: editPriority as any, internalNotes: editNotes },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) });
          setEditingProject(null);
          toast({ title: "Project updated" });
        },
      }
    );
  };

  const handleStartConversation = (id: number) => {
    conversationMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListProjectsQueryKey({}) });
        toast({ title: "Conversation started", description: "Client can now message on this project." });
      },
    });
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-projects-heading">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all client service requests.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 h-9 text-sm"
              data-testid="input-search-projects"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-admin-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded" />)}
            </div>
          ) : !filtered.length ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No projects found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20" data-testid={`row-admin-project-${p.id}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-xs">{p.clientName}</p>
                        <p className="text-[11px] text-muted-foreground">{p.clientEmail}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium truncate max-w-[140px]">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">{p.serviceType}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`text-[10px] ${statusColor[p.status]}`}>{p.status}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium uppercase ${priorityColor[p.priority]}`}>{p.priority}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-primary font-medium text-xs">{p.price ? `$${p.price}` : "—"}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!p.hasConversation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleStartConversation(p.id)}
                              disabled={conversationMutation.isPending}
                              data-testid={`button-start-conversation-${p.id}`}
                            >
                              <MessageSquare size={11} /> Chat
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(p)}
                            data-testid={`button-edit-project-${p.id}`}
                          >
                            <Edit size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-edit-project">
          <DialogHeader>
            <DialogTitle>Update Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger data-testid="select-edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Internal Notes</label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Internal notes (not visible to client)..."
                rows={3}
                data-testid="textarea-internal-notes"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingProject(null)} className="flex-1" data-testid="button-cancel-edit">Cancel</Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-save-project"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
