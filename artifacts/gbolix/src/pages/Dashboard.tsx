import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  useGetDashboardSummary, useGetRecentActivity, useListProjects, useGetMe,
} from "@workspace/api-client-react";
import { getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey, getListProjectsQueryKey } from "@workspace/api-client-react";
import { FileUp, HelpCircle, Plus, Activity, Layers, CheckSquare, Clock, Files, ArrowRight, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const requestStatusColor: Record<string, string> = {
  pending_review: "bg-blue-500/10 text-blue-400",
  needs_info: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-secondary/10 text-secondary",
  declined: "bg-destructive/10 text-destructive",
  agreement_sent: "bg-purple-500/10 text-purple-400",
  agreement_accepted: "bg-indigo-500/10 text-indigo-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const requestStatusLabel: Record<string, string> = {
  pending_review: "Pending Review",
  needs_info: "Needs More Info",
  approved: "Approved",
  declined: "Declined",
  agreement_sent: "Agreement Sent",
  agreement_accepted: "Agreement Accepted",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const paymentStatusColor: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  paid: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const paymentStatusLabel: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusProgress: Record<string, number> = {
  pending_review: 15,
  needs_info: 25,
  approved: 35,
  declined: 0,
  agreement_sent: 45,
  agreement_accepted: 50,
  in_progress: 60,
  review: 80,
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

type ProjectWithPaymentStatus = {
  paymentStatus?: string | null;
};

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: allProjects, isLoading: projectsLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });
  const projects = allProjects?.filter(p => p.status === "in_progress" || p.status === "review" || p.status === "agreement_accepted");
  const { data: profile } = useGetMe();

  const summaryCards = [
    { label: "Active Tasks",     value: summary?.activeTasks ?? 0,     icon: Activity,      color: "text-secondary",   bg: "bg-secondary/10" },
    { label: "Queued Tasks",     value: summary?.queuedTasks ?? 0,     icon: Clock,         color: "text-blue-400",    bg: "bg-blue-400/10" },
    { label: "Completed",        value: summary?.completedTasks ?? 0,  icon: CheckSquare,   color: "text-primary",     bg: "bg-primary/10" },
    { label: "Unread Messages",  value: summary?.unreadMessages ?? 0,  icon: MessageSquare, color: "text-red-400",     bg: "bg-red-400/10" },
    { label: "Files Uploaded",   value: summary?.filesUploaded ?? 0,   icon: Files,         color: "text-pink-400",    bg: "bg-pink-400/10" },
    { label: "Services Ordered", value: summary?.servicesOrdered ?? 0, icon: Layers,        color: "text-purple-400",  bg: "bg-purple-400/10" },
  ];

  const firstName = profile?.name?.split(" ")[0];

  return (
    <ClientLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8 pt-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }} data-testid="text-dashboard-heading">
              {firstName ? `Welcome back, ${firstName} 👋` : "Welcome back 👋"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Here's an overview of your workspace.</p>
          </div>
          <Link href="/new-request">
            <Button
              className="gap-2 text-sm font-semibold hidden sm:flex"
              style={{ background: "linear-gradient(135deg, #00FF66, #00cc52)", color: "#0B0F14", boxShadow: "0 0 16px rgba(0,255,102,0.25)" }}
              data-testid="button-new-request"
            >
              <Plus size={14} /> New Request
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-all shadow-sm hover:shadow-md" data-testid={`card-summary-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
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
                {projects.slice(0, 4).map(p => {
                  const paymentStatus = (p as typeof p & ProjectWithPaymentStatus).paymentStatus;

                  return (
                    <div key={p.id} className="border border-border rounded-xl p-3.5 hover:border-border/60 transition-all" data-testid={`card-active-task-${p.id}`}>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.serviceType}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Request</span>
                          <Badge className={`text-[10px] ${requestStatusColor[p.status] ?? "bg-muted text-muted-foreground"}`}>
                            {requestStatusLabel[p.status] ?? p.status}
                          </Badge>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">Payment</span>
                          {paymentStatus ? (
                            <Badge className={`text-[10px] ${paymentStatusColor[paymentStatus] ?? "bg-muted text-muted-foreground"}`}>
                              {paymentStatusLabel[paymentStatus] ?? paymentStatus}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <Progress value={statusProgress[p.status] ?? 0} className="h-1" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

        <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/new-request">
              <Button size="sm" className="gap-2 text-xs font-semibold" style={{ background: "linear-gradient(135deg, #00FF66, #00cc52)", color: "#0B0F14" }} data-testid="button-quick-new-request">
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
