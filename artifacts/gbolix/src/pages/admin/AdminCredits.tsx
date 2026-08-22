import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { customFetch, getAdminGetInsightsQueryKey, useAdminGetInsights } from "@workspace/api-client-react";
import { History, Loader2, Plus, RefreshCw, Search, ShieldCheck, WalletCards } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CurrencyDisplayDisclosure, CurrencyToggle, formatMoney, type AdminCurrency } from "@/components/admin-currency";

type Money = { currency: string; amount: number };
type Customer = {
  id: number;
  name?: string | null;
  email?: string | null;
  availableCredits: number;
  reservedCredits: number;
  totalCredits: number;
  totalCreditsPurchased: number;
  totalCreditValue: Money[];
  purchaseCount: number;
  history: Array<{ id: number; type: string; credits: number; sourceType: string; sourceKey: string; metadata: Record<string, unknown>; createdAt: string }>;
  purchases: Array<{ id: number; orderKey: string; credits: number; amount: number; currency: string; status: string; createdAt: string; paidAt: string | null }>;
};

export default function AdminCredits() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<AdminCurrency>("USD");

  const load = async (value = search) => {
    setLoading(true);
    try {
      const data = await customFetch<Customer[]>(`/api/admin/credits${value.trim() ? `?search=${encodeURIComponent(value.trim())}` : ""}`, { responseType: "json" });
      setCustomers(data);
      setSelectedId(current => current && data.some(customer => customer.id === current) ? current : data[0]?.id ?? null);
    } catch (error) {
      toast({ title: "Credits could not be loaded", description: error instanceof Error ? error.message : "Try again shortly", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(""); }, []);

  const selected = customers.find(customer => customer.id === selectedId) ?? null;
  const { data: insights } = useAdminGetInsights({ range: "all" }, { query: { queryKey: getAdminGetInsightsQueryKey({ range: "all" }) } });
  const displayMoney = (values: Money[] | undefined) => formatMoney(values, displayCurrency, insights?.displayExchangeRate?.rate);

  const applyAdjustment = async () => {
    const amount = Number(credits);
    if (!selected || !Number.isInteger(amount) || amount <= 0 || !reason.trim()) {
      toast({ title: "Adjustment details required", description: "Enter a positive whole-credit amount and a reason.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await customFetch(`/api/admin/credits/${selected.id}/adjust`, { method: "POST", responseType: "json", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credits: amount, reason: reason.trim() }) });
      setCredits("");
      setReason("");
      await load();
      toast({ title: "Credits added", description: `${amount} credits were recorded as an audited manual adjustment.` });
    } catch (error) {
      toast({ title: "Credit adjustment failed", description: error instanceof Error ? error.message : "Try again shortly", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return <ClientLayout>
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Customer operations</p><h1 className="mt-1 text-2xl font-bold">Credits & Wallet</h1><p className="mt-1 text-sm text-muted-foreground">Review balances, purchases, and auditable manual adjustments.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><span className="text-xs text-muted-foreground">Display currency</span><CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} /><Badge variant="outline" className="w-fit gap-1 border-primary/20 text-primary"><ShieldCheck size={12} /> Admin controlled</Badge></div></div>
      <div className="mb-5 rounded-lg border border-border/70 bg-card/50 px-3 py-2"><CurrencyDisplayDisclosure currency={displayCurrency} exchangeRate={insights?.displayExchangeRate} /></div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Customers</h2><p className="mt-1 text-xs text-muted-foreground">{customers.length} client account{customers.length === 1 ? "" : "s"}</p></div><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => void load()} aria-label="Refresh customers"><RefreshCw size={14} /></Button></div><div className="relative mt-4"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} placeholder="Search name or email" className="h-9 pl-9 text-xs" /><Button variant="ghost" size="sm" className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs" onClick={() => void load()}>Search</Button></div></div><div className="max-h-[38rem] overflow-y-auto p-2">{loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-primary" size={18} /></div> : !customers.length ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">No client wallets found.</div> : customers.map(customer => <button key={customer.id} type="button" onClick={() => setSelectedId(customer.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedId === customer.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-accent/50"}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(customer.name?.trim()?.charAt(0) || "C").toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{customer.name || "Unnamed client"}</p><p className="truncate text-xs text-muted-foreground">{customer.email || "No email"}</p></div><div className="text-right"><p className="text-sm font-bold">{customer.availableCredits.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">available</p></div></button>)}</div></section>
        <section className="space-y-5">{selected ? <><div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected customer</p><h2 className="mt-1 text-xl font-bold">{selected.name || "Unnamed client"}</h2><p className="text-sm text-muted-foreground">{selected.email || "No email"}</p></div><WalletCards className="text-primary" size={24} /></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-[10px] uppercase text-muted-foreground">Available</p><p className="mt-1 text-xl font-bold">{selected.availableCredits.toLocaleString()}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Reserved</p><p className="mt-1 text-xl font-bold">{selected.reservedCredits.toLocaleString()}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Purchased</p><p className="mt-1 text-xl font-bold">{selected.totalCreditsPurchased.toLocaleString()}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Purchase value</p><p className="mt-1 text-sm font-bold">{displayMoney(selected.totalCreditValue)}</p></div></div></div><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Plus size={16} className="text-primary" /><h2 className="text-sm font-semibold">Manual credit adjustment</h2></div><p className="mt-1 text-xs text-muted-foreground">Adds to the current balance and creates a permanent ledger record. It never overwrites the existing balance.</p><div className="mt-4 grid gap-3 sm:grid-cols-[0.45fr_1fr]"><Input type="number" min="1" step="1" value={credits} onChange={event => setCredits(event.target.value)} placeholder="Credits" /><Input value={reason} onChange={event => setReason(event.target.value)} placeholder="Reason, e.g. Manual compensation" /></div><Button className="mt-3 gap-2" onClick={() => void applyAdjustment()} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{saving ? "Recording adjustment..." : "Add credits"}</Button></div><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><History size={16} className="text-primary" /><h2 className="text-sm font-semibold">Credit history</h2></div><div className="mt-3 divide-y divide-border">{!selected.history.length ? <p className="py-6 text-sm text-muted-foreground">No credit ledger activity yet.</p> : selected.history.map(entry => <div key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium capitalize">{entry.type.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{entry.sourceType.replace(/_/g, " ")} · {new Date(entry.createdAt).toLocaleString()}</p>{typeof entry.metadata?.reason === "string" && <p className="mt-1 text-xs text-foreground/80">Reason: {entry.metadata.reason}</p>}{typeof entry.metadata?.adminUserId === "number" && <p className="text-[10px] text-muted-foreground">Recorded by admin #{entry.metadata.adminUserId}</p>}</div><span className={`text-sm font-bold ${entry.credits > 0 ? "text-primary" : "text-foreground"}`}>{entry.credits > 0 ? "+" : ""}{entry.credits.toLocaleString()}</span></div>)}</div></div><div className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><WalletCards size={16} className="text-primary" /><h2 className="text-sm font-semibold">Purchase history</h2></div><div className="mt-3 divide-y divide-border">{!selected.purchases.length ? <p className="py-6 text-sm text-muted-foreground">No successful or attempted credit purchases yet.</p> : selected.purchases.map(purchase => <div key={purchase.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{purchase.credits.toLocaleString()} credits · {displayMoney([{ currency: purchase.currency, amount: purchase.amount }])}</p><p className="text-xs text-muted-foreground">{purchase.orderKey} · {new Date(purchase.createdAt).toLocaleString()}</p></div><Badge variant="outline" className="w-fit text-[10px] capitalize">{purchase.status}</Badge></div>)}</div></div></> : <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Select a client to inspect their wallet.</div>}</section>
      </div>
    </div>
  </ClientLayout>;
}
