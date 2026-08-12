import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock3, FileCheck2, FileSignature, Check, X, Loader2, Ban, ShieldCheck, DollarSign } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

export type Offer = { id:number; projectId:number; serviceType:string; serviceName:string; scope:string; requirements?:string|null; price:string; deliveryEstimate?:string|null; terms?:string|null; status:string; sentAt?:string|null; createdAt?:string|null };

const statusStyles: Record<string, string> = {
  sent: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

export function OfferCard({ offer, canRespond, isOwner=false, onChanged }: { offer:Offer; canRespond:boolean; isOwner?:boolean; onChanged?:(offer:Offer,nextStep?:string)=>void }) {
  const [, navigate] = useLocation();
  const [loading,setLoading]=useState<"accept"|"decline"|"withdraw"|null>(null);

  const respond=async(action:"accept"|"decline"|"withdraw")=>{
    setLoading(action);
    try{
      const d=await customFetch<{offer:Offer;nextStep?:string}>(`/api/offers/${offer.id}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},responseType:"json"});
      onChanged?.(d.offer,d.nextStep);
      if(action==="accept" && d.nextStep==="agreement") navigate(`/agreement/${d.offer.projectId}`);
    }catch(e){alert(e instanceof Error?e.message:`Unable to ${action} offer`);}finally{setLoading(null);}
  };

  const statusLabel = offer.status === "sent" ? "Awaiting response" : offer.status === "withdrawn" ? "Withdrawn" : offer.status === "accepted" ? "Accepted" : "Declined";
  const statusClass = statusStyles[offer.status] ?? "bg-muted text-muted-foreground border-border";

  return <article className="w-full max-w-xl overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
    <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 md:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <FileSignature size={20}/>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Project Offer</p>
            <Badge variant="outline" className={`text-[10px] capitalize ${statusClass}`}>{statusLabel}</Badge>
          </div>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight">{offer.serviceName}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{offer.serviceType}</p>
        </div>
      </div>
    </div>

    <div className="space-y-5 px-5 py-5 md:px-6">
      <section>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"><FileCheck2 size={14} className="text-primary"/> Scope of work</div>
        <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{offer.scope}</div>
      </section>

      {offer.requirements&&<section>
        <p className="mb-2 text-xs font-semibold text-foreground">Requirements</p>
        <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{offer.requirements}</div>
      </section>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground"><DollarSign size={14} className="text-primary"/> Investment</div>
          <p className="text-2xl font-bold tracking-tight text-primary">${offer.price}</p>
        </div>
        {offer.deliveryEstimate&&<div className="rounded-xl border border-border bg-background/50 p-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock3 size={14} className="text-primary"/> Delivery</div>
          <p className="text-sm font-semibold leading-5">{offer.deliveryEstimate}</p>
        </div>}
      </div>

      {offer.terms&&<section>
        <p className="mb-2 text-xs font-semibold text-foreground">Terms & notes</p>
        <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{offer.terms}</div>
      </section>}

      {offer.status==="sent"&&canRespond&&<div className="space-y-2 border-t border-border pt-4">
        <Button onClick={()=>respond("accept")} disabled={!!loading} className="h-11 w-full gap-2 font-semibold shadow-sm">
          {loading==="accept"?<Loader2 size={16} className="animate-spin"/>:<Check size={16}/>} Accept Offer
        </Button>
        <Button variant="outline" onClick={()=>respond("decline")} disabled={!!loading} className="h-11 w-full gap-2 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          {loading==="decline"?<Loader2 size={16} className="animate-spin"/>:<X size={16}/>} Decline Offer
        </Button>
      </div>}

      {offer.status==="sent"&&isOwner&&<div className="border-t border-border pt-4">
        <Button onClick={()=>respond("withdraw")} disabled={!!loading} variant="outline" className="h-10 w-full gap-2 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          {loading==="withdraw"?<Loader2 size={15} className="animate-spin"/>:<Ban size={15}/>} Withdraw Offer
        </Button>
      </div>}

      {offer.status==="accepted"&&<div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
        <ShieldCheck size={18} className="mt-0.5 shrink-0"/><div><p className="font-semibold">Offer accepted</p><p className="mt-0.5 text-emerald-300/75">The project agreement is ready for review.</p></div>
      </div>}
      {offer.status==="declined"&&<div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"><p className="font-semibold">Offer declined</p><p className="mt-0.5 text-red-300/75">No additional conversation message was created.</p></div>}
      {offer.status==="withdrawn"&&<div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">This offer has been withdrawn and is no longer available for acceptance.</div>}
    </div>
  </article>;
}
