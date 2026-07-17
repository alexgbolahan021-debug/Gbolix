import { ClientLayout } from "@/components/ClientLayout";
import { useAdminGetInsights } from "@workspace/api-client-react";
import { getAdminGetInsightsQueryKey } from "@workspace/api-client-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis,
} from "recharts";

const COLORS = [
  "#00FF66", "#A855F7", "#60A5FA", "#FBBF24", "#F87171", "#34D399", "#C084FC", "#FB923C", "#E879F9",
];

function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="text-muted-foreground text-sm text-center py-8">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#121821", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function BarCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="text-muted-foreground text-sm text-center py-8">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
            <Tooltip contentStyle={{ background: "#121821", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function AdminInsights() {
  const { data: insights, isLoading } = useAdminGetInsights({
    query: { queryKey: getAdminGetInsightsQueryKey() },
  });

  const statCards = [
    { label: "Total Users", value: insights?.totalUsers ?? 0, color: "text-primary" },
    { label: "Total Clients", value: insights?.totalClients ?? 0, color: "text-blue-400" },
    { label: "Total Requests", value: insights?.totalRequests ?? 0, color: "text-secondary" },
    { label: "Active Projects", value: insights?.activeProjects ?? 0, color: "text-yellow-400" },
    { label: "Completed", value: insights?.completedProjects ?? 0, color: "text-primary" },
  ];

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" data-testid="text-admin-insights-heading">Insights</h1>
          <p className="text-muted-foreground text-sm mt-1">Analytics and breakdown of your client base.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map(card => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-4 text-center" data-testid={`card-insight-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded mx-auto mb-1" />
              ) : (
                <p className={`text-3xl font-bold ${card.color}`} data-testid={`text-insight-value-${card.label.toLowerCase().replace(/\s/g, "-")}`}>{card.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        {(insights?.insightsSummary ?? []).length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-8">
            <h2 className="font-semibold text-sm mb-3 text-primary">AI-Powered Insights</h2>
            <ul className="space-y-2">
              {insights?.insightsSummary?.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-2" data-testid={`text-ai-insight-${i}`}>
                  <span className="text-primary mt-0.5 shrink-0">→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Charts grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <PieCard title="User Types" data={insights?.userTypeBreakdown ?? []} />
          <BarCard title="Acquisition Sources" data={insights?.acquisitionSourceBreakdown ?? []} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <BarCard title="Location Distribution" data={insights?.locationBreakdown ?? []} />
          <PieCard title="Company Size" data={insights?.companySizeBreakdown ?? []} />
        </div>
      </div>
    </ClientLayout>
  );
}
