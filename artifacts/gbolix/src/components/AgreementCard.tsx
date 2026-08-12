import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, Download, FileSignature, Loader2 } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

export type Agreement = {
  id: number;
  projectId: number;
  scope: string;
  deliverables: string;
  timeline: string;
  revisions: string;
  price: string;
  terms: string;
  acceptedAt?: string | null;
  acceptedByUserId?: number | null;
  createdAt?: string | null;
  projectTitle?: string | null;
  serviceType?: string | null;
  clientName?: string | null;
};

export function AgreementCard({ agreement, canAccept, onChanged }: { agreement: Agreement; canAccept: boolean; onChanged?: (agreement: Agreement, nextStep?: string) => void }) {
  const [current, setCurrent] = useState(agreement);
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    try {
      const data = await customFetch<{ agreement: Agreement; nextStep?: string }>(`/api/agreements/${current.id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, responseType: "json" });
      const updatedAgreement = { ...current, ...data.agreement };
      setCurrent(updatedAgreement);
      onChanged?.(updatedAgreement, data.nextStep);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to accept agreement");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    const previousTitle = document.title;
    document.title = `Gbolix Agreement - ${current.projectTitle ?? "Project"}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  const accepted = !!current.acceptedAt;
  const agreementDate = current.createdAt ? new Date(current.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="w-full max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_12px_40px_rgba(0,0,0,0.18)] print:shadow-none print:border-border">
        <div className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 md:px-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FileSignature size={20} /></div>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Gbolix Agreement</p><h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">Review your project agreement</h2><p className="mt-1 text-sm text-muted-foreground">Please review the agreement overview below before accepting.</p></div>
          <Badge variant="outline" className={`hidden text-[10px] sm:inline-flex ${accepted ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-primary/20 bg-primary/10 text-primary"}`}>{accepted ? "Accepted" : "Ready to review"}</Badge>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-7">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"><Check size={18} className="mt-0.5 shrink-0 text-emerald-400" /><div><p className="text-sm font-semibold text-emerald-300">Your agreement is ready</p><p className="mt-0.5 text-xs text-emerald-300/75">Review the agreement overview below and accept to continue.</p></div></div>

          <section className="overflow-hidden rounded-xl border border-border bg-background/30">
            <div className="border-b border-border px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Agreement Overview</p></div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.5fr] sm:gap-4"><p className="text-xs text-muted-foreground">Project / Service</p><p className="text-sm font-medium">{current.projectTitle ?? current.serviceType ?? current.deliverables}</p></div>
              <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.5fr] sm:gap-4"><p className="text-xs text-muted-foreground">Client</p><p className="text-sm font-medium">{current.clientName ?? "Client"}</p></div>
              <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.5fr] sm:gap-4"><p className="text-xs text-muted-foreground">Price</p><p className="text-sm font-bold text-primary">${current.price}</p></div>
              <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.5fr] sm:gap-4"><p className="text-xs text-muted-foreground">Delivery Timeline</p><p className="flex items-center gap-2 text-sm font-medium"><CalendarDays size={15} className="text-primary" />{current.timeline}</p></div>
              <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.5fr] sm:gap-4"><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{agreementDate}</p></div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 md:flex-row md:items-center md:justify-between md:px-7 print:hidden">
          <div><p className="text-xs text-muted-foreground">Total Price</p><p className="text-xl font-bold text-primary">${current.price}</p></div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" onClick={downloadPdf} className="h-10 gap-2 sm:min-w-40"><Download size={16} /> Download PDF</Button>{canAccept && !accepted && <Button onClick={accept} disabled={loading} className="h-10 gap-2 font-semibold sm:min-w-48">{loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{loading ? "Accepting..." : "Accept & Continue"}</Button>}</div>
        </div>

        {accepted && <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-5 py-3 text-sm text-emerald-300 md:px-7">Agreement accepted. The project can now continue to the next workflow step.</div>}
      </div>
    </div>
  );
}
