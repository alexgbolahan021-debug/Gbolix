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
import { FileUp, HelpCircle, Plus, Activity, Layers, CheckSquare, Clock, Files, ArrowRight } from "lucide-react";
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

const activityTypeColor: Record<string, string> = {
  request_submitted: "bg-primary",
  admin_response: "bg-secondary",
  file_uploaded: "bg-blue-400",
  status_change: "bg-yellow-400",
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
    { label: "Active Tasks", value: summary?.activeTasks ?? 0, icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Queued Tasks", value: summary?.queuedTasks ?? 0, icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Completed Tasks", value: summary?.completedTasks ?? 0, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
    { label: "Open Tickets", value: summary?.openTickets ?? 0, icon: HelpCircle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Files Uploaded", value: summary?.filesUploaded ?? 0, icon: Files, color: "text-pink-400", bg: "bg-pink-400/10" },
    { label: "Services Ordered", value: summary?.servicesOrdered ?? 0, icon: Layers, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  const firstName = profile?.name?.split(" ")[0];

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }} data-testid="text-dashboard-heading">
              {firstName ? `Welcome back, ${firstName} 👋` : "Welcome back 👋"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's an overview of your workspace.</p>
          </div>
          <Link href="/new-request">
            <Button
              className="gap-2 text-sm font-semibold hidden sm:flex"
              style={{
                background: "linear-gradient(135deg, #00FF66, #00cc52)",
                color: "#0B0F14",
                boxShadow: "0 0 16px rgba(0,255,102,0.25)",
              }}
              data-testid="button-new-request"
            >
              <Plus size={14} /> New Request
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-all shadow-sm hover:shadow-md"
                data-testid={`card-summary-${card.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{card.label}</span>
                  <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={13} className={card.color} />
                  </div>
                </div>
                {summaryLoading ? (
                  <div className="h-8 w-14 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-3xl font-extrabold" style={{ fontFamily: "Sora, sans-serif" }} data-testid={`text-summary-value-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                    {card.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Active Tasks */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Active Tasks</h2>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 gap-1">
                  View All <ArrowRight size={11} />
                </Button>
              </Link>
            </div>

            {projectsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !projects?.length ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto">
                  <Layers size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active tasks yet.</p>
                <Link href="/new-request">
                  <Button size="sm" variant="outline" className="text-xs">Submit a Request</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map(p => (
                  <div key={p.id} className="border border-border rounded-xl p-3.5 hover:border-border/60 transition-all" data-testid={`card-active-task-${p.id}`}>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.serviceType}</p>
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
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Recent Activity</h2>
            </div>

            {activityLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : !activity?.length ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto">
                  <Activity size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activity.slice(0, 7).map(item => (
                  <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0" data-testid={`item-activity-${item.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activityTypeColor[item.type] ?? "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{activityTypeLabel[item.type] || item.type}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/new-request">
              <Button
                size="sm"
                className="gap-2 text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, #00FF66, #00cc52)",
                  color: "#0B0F14",
                }}
                data-testid="button-quick-new-request"
              >
                <Plus size={12} /> New Request
              </Button>
            </Link>
            <Link href="/files">
              <Button variant="outline" size="sm" className="gap-2 text-xs hover:border-primary/50 hover:text-primary transition-all" data-testid="button-quick-upload-files">
                <FileUp size={12} /> Upload Files
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" size="sm" className="gap-2 text-xs hover:border-secondary/50 hover:text-secondary transition-all" data-testid="button-quick-messages">
                <HelpCircle size={12} /> Messages
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
