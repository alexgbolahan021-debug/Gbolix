import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Check, X, Loader2 } from "lucide-react";

export type Offer = {
  id: number; serviceType: string; serviceName: string; scope: string; requirements?: string | null;
  price: string; deliveryEstimate?: string | null; terms?: string | null; status: string;
};

export function OfferCard({ offer, canRespond, onChanged }: { offer: Offer; canRespond: boolean; onChanged?: (offer: Offer, nextStep?: string) => void }) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const respond = async (action: "accept" | "decline") => {
    setLoading(action);
    try {
      const response = await fetch(`/api/offers/${offer.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Unable to ${action} offer`);
      onChanged?.(data.offer, data.nextStep);
    } catch (error) { alert(error instanceof Error ? error.message : `Unable to ${action} offer`); }
    finally { setLoading(null); }
  };
  const status = offer.status;
  return <div className="w-full max-w-md rounded-xl border border-primary/25 bg-card shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center gap-2"><FileSignature size={17} className="text-primary"/><div className="flex-1"><p className="font-semibold text-sm">Project Offer</p><p className="text-[11px] text-muted-foreground">{offer.serviceType}</p></div><Badge className="text-[10px] bg-primary/10 text-primary border-0 capitalize">{status}</Badge></div>
    <div className="p-4 space-y-3"><div><p className="text-xs text-muted-foreground">Project / Service</p><p className="font-medium text-sm">{offer.serviceName}</p></div><div><p className="text-xs text-muted-foreground">Scope of Work</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.scope}</p></div>{offer.requirements&&<div><p className="text-xs text-muted-foreground">Requirements</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.requirements}</p></div>}<div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Price</p><p className="text-lg font-bold text-primary">${offer.price}</p></div>{offer.deliveryEstimate&&<div><p className="text-xs text-muted-foreground">Delivery</p><p className="text-sm font-medium">{offer.deliveryEstimate}</p></div>}</div>{offer.terms&&<div><p className="text-xs text-muted-foreground">Terms / Notes</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.terms}</p></div>}
      {canRespond&&status==="sent"&&<div className="flex gap-2 pt-2"><Button onClick={()=>respond("accept")} disabled={!!loading} className="flex-1 gap-1.5"><Check size={14}/>{loading==="accept"?<Loader2 size={14} className="animate-spin"/>:"Accept Offer"}</Button><Button variant="outline" onClick={()=>respond("decline")} disabled={!!loading} className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"><X size={14}/>{loading==="decline"?<Loader2 size={14} className="animate-spin"/>:"Decline"}</Button></div>}
      {status==="accepted"&&<div className="rounded-lg bg-primary/10 text-primary text-sm px-3 py-2">Offer accepted. Your next step is payment.</div>}{status==="declined"&&<div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">This offer was declined.</div>}
    </div></div>;
}
