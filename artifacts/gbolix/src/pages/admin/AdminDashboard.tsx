import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useAdminGetInsights, useAdminListProjects } from "@workspace/api-client-react";
import { CurrencyDisplayDisclosure, CurrencyToggle, formatMoney, type AdminCurrency } from "@/components/admin-currency";
import { getAdminGetInsightsQueryKey, getAdminListProjectsQueryKey } from "@workspace/api-client-react";
import { Users, Layers3, CheckSquare, Activity, ArrowRight, WalletCards, DollarSign, Clock3, XCircle, CreditCard, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Range = "7d" | "30d" | "90d" | "12m" | "all";

const statusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-400",
  needs_info: "bg-orange-500/10 text-orange-400",
  approved: "bg-primary/10 text-primary",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  agreement_sent: "bg-blue-500/10 text-blue-400",
  agreement_accepted: "bg-blue-500/10 text-blue-400",
  queued: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted", pending_review: "Pending Review", needs_info: "Needs More Info", approved: "Approved", declined: "Declined",
  agreement_sent: "Agreement Sent", agreement_accepted: "Agreement Accepted", cancelled: "Cancelled", queued: "Queued", in_progress: "In Progress", review: "Review", completed: "Completed",
};

export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const [displayCurrency, setDisplayCurrency] = useState<AdminCurrency>("USD");
  const { data: insights, isLoading: insightsLoading } = useAdminGetInsights(
    { range },
    { query: { queryKey: getAdminGetInsightsQueryKey({ range }) } },
  );
  const { data: projects, isLoading: projectsLoading } = useAdminListProjects(
    {},
    { query: { queryKey: getAdminListProjectsQueryKey({}) } },
  );

  const summaryCards = [
    { label: "Total Users", value: insights?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { label: "Total Clients", value: insights?.totalClients ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Total Requests", value: insights?.totalRequests ?? 0, icon: Layers3, color: "text-secondary" },
    { label: "Active Projects", value: insights?.activeProjects ?? 0, icon: Activity, color: "text-yellow-400" },
    { label: "Completed Projects", value: insights?.completedProjects ?? 0, icon: CheckSquare, color: "text-primary" },
    { label: "Pending Requests", value: insights?.pendingRequests ?? 0, icon: Clock3, color: "text-orange-400" },
    { label: "Accepted Requests", value: insights?.acceptedRequests ?? 0, icon: TrendingUp, color: "text-blue-400" },
    { label: "Declined Projects", value: insights?.declinedProjects ?? 0, icon: XCircle, color: "text-destructive" },
    { label: "Completed Requests", value: insights?.completedRequests ?? 0, icon: CheckSquare, color: "text-primary" },
  ];

  const recentProjects = projects?.slice(0, 8) ?? [];
  const loading = insightsLoading;
  const displayMoney = (values: Array<{ currency: string; amount: number }> | undefined) => formatMoney(values, displayCurrency, insights?.displayExchangeRate?.rate);

  return (
    <ClientLayout>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operations overview</p>
            <h1 className="mt-1 text-2xl font-bold" data-testid="text-admin-dashboard-heading">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">One live view of users, requests, projects, payments, and wallet activity.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Display currency</span>
            <CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />
            <Select value={range} onValueChange={value => setRange(value as Range)}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="7d">7 days</SelectItem><SelectItem value="30d">30 days</SelectItem><SelectItem value="90d">90 days</SelectItem><SelectItem value="12m">12 months</SelectItem><SelectItem value="all">All time</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="mb-5 rounded-lg border border-border/70 bg-card/50 px-3 py-2">
          <CurrencyDisplayDisclosure currency={displayCurrency} exchangeRate={insights?.displayExchangeRate} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return <div key={card.label} className="rounded-xl border border-border bg-card p-4" data-testid={`card-admin-summary-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="mb-3 flex items-center justify-between gap-2"><span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{card.label}</span><Icon size={14} className={card.color} /></div>
              {loading ? <div className="h-7 w-12 animate-pulse rounded bg-muted" /> : <span className="text-2xl font-bold">{card.value.toLocaleString()}</span>}
            </div>;
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Project finances</p><h2 className="mt-1 text-lg font-bold">Real payment ledger</h2></div><Link href="/admin/insights"><Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground">View insights <ArrowRight size={12} /></Button></Link></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[{ label: "Paid", value: insights?.totalAmountPaid, icon: DollarSign, color: "text-primary" }, { label: "Pending", value: insights?.totalAmountPending, icon: Clock3, color: "text-yellow-400" }, { label: "Declined", value: insights?.totalAmountDeclined, icon: XCircle, color: "text-destructive" }, { label: "Total project value", value: insights?.projectValue, icon: Layers3, color: "text-blue-400" }].map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-lg border border-border/80 bg-background/40 p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon size={13} className={item.color} />{item.label}</div><p className="mt-2 text-sm font-bold">{displayMoney(item.value)}</p></div>; })}
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.05] p-5">
            <div className="flex items-center gap-2"><WalletCards size={17} className="text-primary" /><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Gbolix Wallet</p><h2 className="mt-1 text-lg font-bold">Credit health</h2></div></div>
            <div className="mt-5 space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Successful purchases</span><strong>{insights?.wallet.totalPurchases ?? 0}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Credits purchased</span><strong>{(insights?.wallet.creditsPurchased ?? 0).toLocaleString()}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Credits outstanding</span><strong>{(insights?.wallet.outstandingCredits ?? 0).toLocaleString()}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Credits used</span><strong>{(insights?.wallet.creditsUsed ?? 0).toLocaleString()}</strong></div></div>
            <Link href="/admin/credits"><Button className="mt-5 h-9 w-full gap-2 text-xs"><CreditCard size={13} /> Manage credits</Button></Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Revenue</p><p className="mt-2 text-lg font-bold text-primary">{displayMoney(insights?.totalRevenue)}</p><p className="mt-1 text-[11px] text-muted-foreground">Successful project payments</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Credit Value</p><p className="mt-2 text-lg font-bold text-blue-400">{displayMoney(insights?.wallet.purchaseValue)}</p><p className="mt-1 text-[11px] text-muted-foreground">Successful wallet purchases</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding Payment Value</p><p className="mt-2 text-lg font-bold text-yellow-400">{displayMoney(insights?.outstandingPaymentValue)}</p><p className="mt-1 text-[11px] text-muted-foreground">Pending project payments</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Customers Who Purchased Credits</p><p className="mt-2 text-lg font-bold text-secondary">{(insights?.wallet.purchasingCustomers ?? 0).toLocaleString()}</p><p className="mt-1 text-[11px] text-muted-foreground">Unique successful buyers</p></div></div>

        {insights?.insightsSummary?.length ? <div className="mt-6 rounded-xl border border-primary/20 bg-card p-5"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-primary" /> Live insights</h2><div className="grid gap-2 md:grid-cols-3">{insights.insightsSummary.map((item, index) => <p key={index} className="text-sm text-muted-foreground">{item}</p>)}</div></div> : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Recent Requests</h2><Link href="/admin/projects"><Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">View all <ArrowRight size={11} /></Button></Link></div>
          {projectsLoading ? <div className="space-y-2 p-4">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div> : !recentProjects.length ? <div className="py-12 text-center text-sm text-muted-foreground">No projects yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</th><th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</th><th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th><th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th></tr></thead><tbody>{recentProjects.map(p => <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20"><td className="px-5 py-3"><p className="text-xs font-medium">{p.clientName}</p><p className="text-[11px] text-muted-foreground">{p.clientEmail}</p></td><td className="px-5 py-3"><p className="max-w-[180px] truncate text-xs font-medium">{p.title}</p><p className="text-[11px] text-muted-foreground">{p.serviceType}</p></td><td className="px-5 py-3"><Badge className={`text-[10px] ${statusColor[p.status] ?? "bg-muted text-muted-foreground"}`}>{statusLabel[p.status] ?? p.status}</Badge></td><td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </ClientLayout>
  );
}
