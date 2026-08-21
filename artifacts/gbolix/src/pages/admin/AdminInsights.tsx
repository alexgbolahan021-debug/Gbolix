import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminGetInsights, getAdminGetInsightsQueryKey } from "@workspace/api-client-react";
import { BarChart3, TrendingUp, WalletCards, Users, FolderKanban, DollarSign } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Range = "7d" | "30d" | "90d" | "12m" | "all";
const COLORS = ["#00FF66", "#A855F7", "#60A5FA", "#FBBF24", "#F87171", "#34D399", "#C084FC", "#FB923C"];

function money(values: Array<{ currency: string; amount: number }> | undefined) {
  if (!values?.length) return "—";
  return values.map(value => `${value.currency} ${value.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" · ");
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-card p-5 ${className}`}><h2 className="mb-4 text-sm font-semibold">{title}</h2>{children}</section>;
}

function Empty({ text = "No data available for this view." }: { text?: string }) {
  return <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-5 text-center text-sm text-muted-foreground">{text}</div>;
}

function TooltipStyle() {
  return { background: "#121821", border: "1px solid #1e2a3a", borderRadius: 8, fontSize: 12 };
}

export default function AdminInsights() {
  const [range, setRange] = useState<Range>("30d");
  const { data: insights, isLoading } = useAdminGetInsights({ range }, { query: { queryKey: getAdminGetInsightsQueryKey({ range }) } });
  const chartData = insights?.usersOverTime ?? [];
  const projectStatus = insights?.statusBreakdown ?? [];
  const projectValue = insights?.projectValueByStatus ?? [];
  const revenue = insights?.revenueOverTime ?? [];

  const statCards = [
    { label: "Total Users", value: insights?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { label: "Total Clients", value: insights?.totalClients ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Total Projects", value: insights?.totalProjects ?? 0, icon: FolderKanban, color: "text-secondary" },
    { label: "Conversion Rate", value: `${insights?.conversionRate ?? 0}%`, icon: TrendingUp, color: "text-yellow-400" },
  ];

  return <ClientLayout>
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Business intelligence</p><h1 className="mt-1 text-2xl font-bold" data-testid="text-admin-insights-heading">Insights</h1><p className="mt-1 text-sm text-muted-foreground">Deeper analysis from the same records that power the Admin Dashboard.</p></div><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Date range</span><Select value={range} onValueChange={value => setRange(value as Range)}><SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">7 days</SelectItem><SelectItem value="30d">30 days</SelectItem><SelectItem value="90d">90 days</SelectItem><SelectItem value="12m">12 months</SelectItem><SelectItem value="all">All time</SelectItem></SelectContent></Select></div></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{statCards.map(card => { const Icon = card.icon; return <div key={card.label} className="rounded-xl border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{card.label}</span><Icon size={14} className={card.color} /></div>{isLoading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>}</div>; })}</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="User and client growth"><div className="h-64">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} /><Line type="monotone" dataKey="value" name="New users" stroke="#00FF66" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <Empty text="No user registrations in this range." />}</div></Card>
        <Card title="Projects over time"><div className="h-64">{insights?.projectsOverTime?.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={insights.projectsOverTime}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} /><Line type="monotone" dataKey="value" name="Projects" stroke="#A855F7" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <Empty text="No project activity in this range." />}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Requests by status"><div className="h-72">{projectStatus.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={projectStatus} layout="vertical" margin={{ left: 15, right: 15 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} /><Bar dataKey="value" radius={[0, 4, 4, 0]}>{projectStatus.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <Empty />}</div></Card>
        <Card title="Project value by status (USD)"><div className="h-72">{projectValue.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={projectValue}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis dataKey="status" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} /><Bar dataKey="amount" fill="#00FF66" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty text="Project prices are not available yet." />}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Revenue over time"><div className="h-72">{revenue.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={revenue}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} formatter={(value: number, _name: string, item: any) => [`${item?.payload?.currency ?? ""} ${value.toLocaleString()}`, "Paid"]} /><Line type="monotone" dataKey="value" stroke="#00FF66" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <Empty text="No successful payments in this range." />}</div></Card>
        <Card title="Wallet purchase value over time"><div className="h-72">{insights?.creditPurchaseValueOverTime?.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={insights.creditPurchaseValueOverTime}><CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} /><Line type="monotone" dataKey="value" stroke="#60A5FA" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <Empty text="No successful credit purchases in this range." />}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card title="Customer and request mix"><div className="grid gap-5 md:grid-cols-2"><div><p className="mb-2 text-xs font-medium text-muted-foreground">User Types</p>{insights?.userTypeBreakdown?.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={insights.userTypeBreakdown} dataKey="value" nameKey="name" outerRadius={72} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{insights.userTypeBreakdown.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={TooltipStyle()} /></PieChart></ResponsiveContainer> : <Empty />}</div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Acquisition Sources</p>{insights?.acquisitionSourceBreakdown?.length ? <ResponsiveContainer width="100%" height={210}><BarChart data={insights.acquisitionSourceBreakdown} layout="vertical"><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} /><Tooltip contentStyle={TooltipStyle()} /><Bar dataKey="value" fill="#A855F7" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <Empty />}</div></div></Card>
        <Card title="Wallet performance"><div className="space-y-4"><div className="flex items-center gap-3"><WalletCards size={18} className="text-primary" /><div><p className="text-xs text-muted-foreground">Purchase value</p><p className="text-sm font-bold">{money(insights?.wallet.purchaseValue)}</p></div></div><div className="flex items-center gap-3"><DollarSign size={18} className="text-blue-400" /><div><p className="text-xs text-muted-foreground">Average purchase</p><p className="text-sm font-bold">{money(insights?.wallet.averagePurchaseValue)}</p></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase text-muted-foreground">Customers</p><p className="mt-1 text-lg font-bold">{insights?.wallet.purchasingCustomers ?? 0}</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] uppercase text-muted-foreground">Credits used</p><p className="mt-1 text-lg font-bold">{(insights?.wallet.creditsUsed ?? 0).toLocaleString()}</p></div></div></div></Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline" className="border-primary/20 text-primary">Live database metrics</Badge><span>Generated {insights?.generatedAt ? new Date(insights.generatedAt).toLocaleString() : "when data loads"}.</span>{insights?.openTickets === null && <span>Ticket analytics unavailable because no ticket model exists yet.</span>}</div>
    </div>
  </ClientLayout>;
}
