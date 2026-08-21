import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientLayout } from "@/components/ClientLayout";
import { checkoutErrorMessage } from "@/lib/walletCheckout";
import { Coins, CreditCard, Loader2, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

type WalletContext = {
  workspace: { key: string; name: string; membershipRole: string };
  wallet: { availableCredits: number; reservedCredits: number; totalCredits: number; neverExpires: boolean };
  products: Array<{ key: string; displayName: string; productStatus: string; entitlementStatus: string }>;
  packs: Array<{ key: string; name: string; credits: number; price: number; currency: string; badge: string | null }>;
};

type LedgerEntry = { id: number; type: string; credits: number; sourceType: string; createdAt: string };

async function getWallet() {
  return customFetch<WalletContext>("/api/wallet", { responseType: "json" });
}

async function getLedger() {
  return customFetch<LedgerEntry[]>("/api/wallet/ledger", { responseType: "json" });
}

export default function Wallet() {
  const queryClient = useQueryClient();
  const wallet = useQuery({ queryKey: ["wallet-context"], queryFn: getWallet });
  const ledger = useQuery({ queryKey: ["wallet-ledger"], queryFn: getLedger });
  const [checkoutPackKey, setCheckoutPackKey] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkout = async (packKey: string) => {
    setCheckoutError(null);
    setCheckoutPackKey(packKey);
    try {
      const result = await customFetch<{ authorizationUrl: string }>(
        `/api/wallet/checkout/${packKey}/initialize`,
        { method: "POST", responseType: "json" },
      );
      if (!result.authorizationUrl) throw new Error("Checkout did not return a secure payment URL.");
      queryClient.invalidateQueries({ queryKey: ["wallet-context"] });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setCheckoutError(checkoutErrorMessage(error));
    } finally {
      setCheckoutPackKey(null);
    }
  };

  const data = wallet.data;

  return (
    <ClientLayout>
      <div className="mx-auto max-w-6xl p-5 md:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Gbolix Wallet v1.0</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>One Wallet. Three Powerful Tools.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Buy credits once and use them across Gbolix Leads, Gbolix Monitor, and Gbolix AI Agent. Credits never expire.</p>
          </div>
          <Badge className="w-fit border-primary/20 bg-primary/10 text-primary"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Workspace-bound balance</Badge>
        </div>

        {wallet.isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : wallet.isError || !data ? (
          <div className="mt-7 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">Your wallet could not be loaded. Refresh the page or contact Gbolix support.</div>
        ) : (
          <>
            {checkoutError && (
              <div role="alert" className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Checkout could not start.</p>
                <p className="mt-1">{checkoutError}</p>
              </div>
            )}

            <section className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-6 md:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Available credits</p>
                    <p className="mt-3 text-5xl font-extrabold" style={{ fontFamily: "Sora, sans-serif" }}>{data.wallet.availableCredits.toLocaleString()}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Ready to spend across your workspace.</p>
                  </div>
                  <div className="rounded-2xl bg-primary/15 p-4 text-primary"><WalletCards size={28} /></div>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-background"><div className="h-full bg-primary" style={{ width: `${data.wallet.totalCredits ? Math.max(8, (data.wallet.availableCredits / data.wallet.totalCredits) * 100) : 0}%` }} /></div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{data.wallet.reservedCredits.toLocaleString()} reserved for running jobs</span><span>Never expires</span></div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
                <p className="mt-3 text-lg font-bold">{data.workspace.name}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{data.workspace.key}</p>
                <p className="mt-6 text-xs text-muted-foreground">Shared balances are ready for future workspace members.</p>
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Credit packs</p><h2 className="mt-1 text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>Top up when you need more.</h2></div><span className="hidden text-xs text-muted-foreground sm:block">No subscriptions. No expiry.</span></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {data.packs.map((pack) => {
                  const isOpeningCheckout = checkoutPackKey === pack.key;
                  return (
                    <article key={pack.key} className={`relative rounded-2xl border p-5 ${pack.badge ? "border-primary/50 bg-primary/[0.04]" : "border-border bg-card"}`}>
                      {pack.badge && <Badge className="absolute right-4 top-4 border-0 bg-primary text-[10px] text-primary-foreground">{pack.badge}</Badge>}
                      <Coins className="h-5 w-5 text-primary" />
                      <p className="mt-5 text-sm font-semibold">{pack.name}</p>
                      <p className="mt-2 text-3xl font-extrabold">{pack.credits.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Gbolix credits</p>
                      <p className="mt-5 text-xl font-bold">${pack.price.toFixed(0)} <span className="text-xs font-medium text-muted-foreground">{pack.currency}</span></p>
                      <Button disabled={checkoutPackKey !== null} onClick={() => checkout(pack.key)} className="mt-5 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        {isOpeningCheckout ? <><Loader2 size={14} className="animate-spin" /> Opening checkout…</> : <><CreditCard size={14} /> Buy credits</>}
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><ReceiptText size={17} className="text-primary" /><h2 className="font-bold">Wallet activity</h2></div><div className="mt-4 divide-y divide-border">{ledger.isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading activity…</p> : !ledger.data?.length ? <p className="py-6 text-sm text-muted-foreground">No wallet activity yet. Your first credit purchase will appear here.</p> : ledger.data.slice(0, 8).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium capitalize">{entry.type.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{entry.sourceType.replace(/_/g, " ")} · {new Date(entry.createdAt).toLocaleString()}</p></div><span className={`font-bold ${entry.credits > 0 ? "text-primary" : "text-foreground"}`}>{entry.credits > 0 ? "+" : ""}{entry.credits}</span></div>)}</div></div>
              <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">How Gbolix Leads uses credits</p><h2 className="mt-2 text-xl font-bold">Fair usage by design.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">One qualified new lead uses one credit. Before charging, Gbolix Leads suppresses leads that already exist in this workspace. Credits are reserved while a job runs, then only the measured new qualified leads are finalized. The unused hold returns automatically.</p></div>
            </section>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
