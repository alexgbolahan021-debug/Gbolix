import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useListProjects,
  useGetMe,
} from "@workspace/api-client-react";
import { getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";
import { FileUp, HelpCircle, Plus, Activity, Layers, CheckSquare, Clock, Files } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  processing: "bg-secondary/10 text-secondary",
  testing: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const statusProgress: Record<string, number> = {
  backlog: 10,
  queued: 30,
  processing: 60,
  testing: 80,
  completed: 100,
};

const activityTypeLabel: Record<string, string> = {
  request_submitted: "Request Submitted",
  admin_response: "Admin Response",
  file_uploaded: "File Uploaded",
  status_change: "Status Change",
};

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: projects, isLoading: projectsLoading } = useListProjects(
    { status: "processing" },
    { query: { queryKey: getListProjectsQueryKey({ status: "processing" }) } }
  );
  const { data: profile } = useGetMe();

  const summaryCards = [
    { label: "Active Tasks", value: summary?.activeTasks ?? 0, icon: Activity, color: "text-secondary" },
    { label: "Queued Tasks", value: summary?.queuedTasks ?? 0, icon: Clock, color: "text-blue-400" },
    { label: "Completed Tasks", value: summary?.completedTasks ?? 0, icon: CheckSquare, color: "text-primary" },
    { label: "Open Tickets", value: summary?.openTickets ?? 0, icon: HelpCircle, color: "text-yellow-400" },
    { label: "Files Uploaded", value: summary?.filesUploaded ?? 0, icon: Files, color: "text-pink-400" },
    { label: "Services Ordered", value: summary?.servicesOrdered ?? 0, icon: Layers, color: "text-purple-400" },
  ];

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-heading">
              Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's what's happening with your projects.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/new-request">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm" data-testid="button-new-request">
                <Plus size={14} /> New Request
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4" data-testid={`card-summary-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</span>
                  <Icon size={14} className={card.color} />
                </div>
                {summaryLoading ? (
                  <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-2xl font-bold" data-testid={`text-summary-value-${card.label.toLowerCase().replace(/\s/g, "-")}`}>{card.value}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Tasks */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Active Tasks</h2>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">View All</Button>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !projects?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active tasks. <Link href="/new-request" className="text-primary hover:underline">Submit a request</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map(p => (
                  <div key={p.id} className="border border-border rounded-lg p-3" data-testid={`card-active-task-${p.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.serviceType}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ml-2 ${statusColor[p.status]}`}>{p.status}</Badge>
                    </div>
                    <Progress value={statusProgress[p.status]} className="h-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recent Activity</h2>
            </div>

            {activityLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !activity?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No activity yet.</div>
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0" data-testid={`item-activity-${item.id}`}>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{activityTypeLabel[item.type] || item.type}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/new-request">
              <Button variant="outline" size="sm" className="gap-2 text-xs" data-testid="button-quick-new-request">
                <Plus size={12} /> New Request
              </Button>
            </Link>
            <Link href="/files">
              <Button variant="outline" size="sm" className="gap-2 text-xs" data-testid="button-quick-upload-files">
                <FileUp size={12} /> Upload Files
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-2 text-xs" disabled data-testid="button-quick-support-ticket">
              <HelpCircle size={12} /> Open Support Ticket
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
