import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { getListProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const priorityColor: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-400",
  high: "text-yellow-400",
  urgent: "text-destructive",
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const { data: allProjects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() },
  });
  const projects = allProjects;

  const filtered = projects?.filter(p => {
    if (serviceFilter !== "all" && !p.serviceType.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
    return true;
  }) ?? [];

  const serviceTypes = [...new Set(projects?.map(p => p.serviceType) ?? [])];

  return (
    <ClientLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-tasks-heading">My Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">Track all your service requests and their progress.</p>
          </div>
          <Link href="/new-request">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm" data-testid="button-new-request">
              <Plus size={14} /> New Request
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-48 h-9 text-sm" data-testid="select-service-filter">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="space-y-px">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted/30 animate-pulse" />)}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm mb-3">No tasks found.</p>
              <Link href="/new-request">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs" data-testid="button-submit-first-request">Submit your first request</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors" data-testid={`row-task-${p.id}`}>
                      <td className="px-5 py-4">
                        <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.serviceType}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={`text-xs ${statusColor[p.status]}`} data-testid={`badge-status-${p.id}`}>{p.status}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium uppercase ${priorityColor[p.priority]}`}>{p.priority}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-primary font-medium">{p.price ? `$${p.price}` : "—"}</span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-5 py-4">
                        {p.hasConversation && (
                          <Link href="/messages">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" data-testid={`button-view-messages-${p.id}`}>
                              Messages <ChevronRight size={12} />
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
