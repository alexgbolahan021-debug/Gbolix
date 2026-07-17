import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAdminGetInsights, useAdminListProjects } from "@workspace/api-client-react";
import { getAdminGetInsightsQueryKey, getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { Users, Layers, CheckSquare, Activity, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted", queued: "Queued", in_progress: "In Progress", review: "Review", completed: "Completed",
};

export default function AdminDashboard() {
  const { data: insights, isLoading: insightsLoading } = useAdminGetInsights({
    query: { queryKey: getAdminGetInsightsQueryKey() },
  });
  const { data: projects, isLoading: projectsLoading } = useAdminListProjects(
    {},
    { query: { queryKey: getAdminListProjectsQueryKey({}) } }
  );

  const summaryCards = [
    { label: "Total Clients", value: insights?.totalClients ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Total Requests", value: insights?.totalRequests ?? 0, icon: Layers, color: "text-secondary" },
    { label: "Active Projects", value: insights?.activeProjects ?? 0, icon: Activity, color: "text-yellow-400" },
    { label: "Completed", value: insights?.completedProjects ?? 0, icon: CheckSquare, color: "text-primary" },
  ];

  const recentProjects = projects?.slice(0, 8) ?? [];

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-dashboard-heading">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Overview of all clients and projects.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4" data-testid={`card-admin-summary-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.label}</span>
                  <Icon size={14} className={card.color} />
                </div>
                {insightsLoading ? (
                  <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-2xl font-bold" data-testid={`text-admin-value-${card.label.toLowerCase().replace(/\s/g, "-")}`}>{card.value}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Insights */}
        {insights?.insightsSummary && insights.insightsSummary.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full" />
              AI Insights
            </h2>
            <ul className="space-y-1.5">
              {insights.insightsSummary.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-insight-${i}`}>
                  <span className="text-primary mt-1">→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Projects */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Recent Requests</h2>
            <Link href="/admin/projects">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7" data-testid="link-view-all-projects">
                View All <ArrowRight size={11} />
              </Button>
            </Link>
          </div>

          {projectsLoading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : !recentProjects.length ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No projects yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20" data-testid={`row-admin-project-${p.id}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-xs">{p.clientName}</p>
                        <p className="text-[11px] text-muted-foreground">{p.clientEmail}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium truncate max-w-[160px]">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">{p.serviceType}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`text-[10px] ${statusColor[p.status]}`}>{statusLabel[p.status] ?? p.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
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
