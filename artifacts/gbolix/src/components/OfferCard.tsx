import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronDown, Check, X, Loader2, Ban, FileSignature } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

export type Offer = {
  id: number;
  projectId: number;
  serviceType: string;
  serviceName: string;
  scope: string;
  requirements?: string | null;
  price: string;
  deliveryEstimate?: string | null;
  terms?: string | null;
  status: string;
  sentAt?: string | null;
  createdAt?: string | null;
};

type OfferResponse = {
  offer: Offer;
  agreement?: { id: number } | null;
  nextStep?: string;
};

const statusStyles: Record<string, string> = {
  sent: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

export function OfferCard({
  offer,
  canRespond,
  isOwner = false,
  onChanged,
}: {
  offer: Offer;
  canRespond: boolean;
  isOwner?: boolean;
  onChanged?: (offer: Offer, nextStep?: string) => void;
}) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<"accept" | "decline" | "withdraw" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const respond = async (action: "accept" | "decline" | "withdraw") => {
    setLoading(action);
    try {
      const data = await customFetch<OfferResponse>(`/api/offers/${offer.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        responseType: "json",
      });

      onChanged?.(data.offer, data.nextStep);

      if (action === "accept" && data.nextStep === "agreement") {
        navigate(`/agreement/${data.agreement?.id ?? data.offer.projectId}`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `Unable to ${action} offer`);
    } finally {
      setLoading(null);
    }
  };

  const statusLabel = offer.status === "sent" ? "Active Offer" : offer.status === "withdrawn" ? "Withdrawn" : offer.status === "accepted" ? "Accepted" : "Declined";
  const statusClass = statusStyles[offer.status] ?? "bg-muted text-muted-foreground border-border";

  return (
    <article className="w-full max-w-[560px] overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileSignature size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Project Offer</p><Badge variant="outline" className={`text-[9px] ${statusClass}`}>{statusLabel}</Badge></div>
          <h3 className="truncate text-sm font-semibold">{offer.serviceName}</h3>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-background/40">
          <div className="px-3 py-2"><p className="text-[10px] text-muted-foreground">Price</p><p className="text-base font-bold text-primary">${offer.price}</p></div>
          <div className="px-3 py-2"><p className="text-[10px] text-muted-foreground">Delivery</p><p className="flex items-center gap-1 text-xs font-semibold">{offer.deliveryEstimate ? <><CalendarDays size={13} className="text-primary" />{offer.deliveryEstimate}</> : "As agreed"}</p></div>
        </div>

        <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scope</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/85">{offer.scope}</p></div>

        {showDetails && <div className="space-y-2 border-t border-border pt-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Service</p><p className="mt-1 text-xs text-foreground/85">{offer.serviceType}</p></div>
          {offer.requirements && <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Requirements</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/75">{offer.requirements}</p></div>}
        </div>}

        {offer.status === "sent" && canRespond && <div className="flex gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={() => respond("decline")} disabled={!!loading} className="h-9 flex-1 gap-1.5 border-red-500/25 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300">{loading === "decline" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Decline Offer</Button>
          <Button onClick={() => respond("accept")} disabled={!!loading} className="h-9 flex-1 gap-1.5 text-xs font-semibold">{loading === "accept" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept Offer</Button>
        </div>}

        {offer.status === "sent" && isOwner && <div className="border-t border-border pt-3"><Button onClick={() => respond("withdraw")} disabled={!!loading} variant="outline" className="h-8 w-full gap-1.5 text-xs border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300">{loading === "withdraw" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Withdraw Offer</Button></div>}

        {offer.status === "sent" && <button type="button" onClick={() => setShowDetails(value => !value)} className="flex w-full items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">{showDetails ? "Hide details" : "View details"}<ChevronDown size={13} className={`transition-transform ${showDetails ? "rotate-180" : ""}`} /></button>}

        {offer.status === "accepted" && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">Offer accepted. Your agreement is ready for review.</div>}
        {offer.status === "declined" && <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">Offer declined.</div>}
        {offer.status === "withdrawn" && <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">This offer has been withdrawn.</div>}
      </div>
    </article>
  );
}
