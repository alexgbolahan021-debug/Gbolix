import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Check, X, Loader2, Ban } from "lucide-react";
import { AgreementCard, type Agreement } from "@/components/AgreementCard";

export type Offer = { id:number; projectId:number; serviceType:string; serviceName:string; scope:string; requirements?:string|null; price:string; deliveryEstimate?:string|null; terms?:string|null; status:string; sentAt?:string|null; createdAt?:string|null };

export function OfferCard({ offer, canRespond, isOwner=false, onChanged }: { offer:Offer; canRespond:boolean; isOwner?:boolean; onChanged?:(offer:Offer,nextStep?:string)=>void }) {
  const [loading,setLoading]=useState<"accept"|"decline"|"withdraw"|"agreement"|null>(null);
  const [agreement,setAgreement]=useState<Agreement|null>(null);

  const loadAgreement=async()=>{try{const r=await fetch(`/api/projects/${offer.projectId}/agreement`);if(r.ok)setAgreement(await r.json());}catch{}};
  useEffect(()=>{if(offer.status==="accepted")loadAgreement();},[offer.status,offer.projectId]);

  const respond=async(action:"accept"|"decline"|"withdraw")=>{
    setLoading(action);
    try{
      const r=await fetch(`/api/offers/${offer.id}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"}});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||`Unable to ${action} offer`);
      onChanged?.(d.offer,d.nextStep);
    }catch(e){alert(e instanceof Error?e.message:`Unable to ${action} offer`);}finally{setLoading(null);}
  };

  const createAgreement=async()=>{setLoading("agreement");try{const r=await fetch(`/api/offers/${offer.id}/agreement`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to create agreement");setAgreement(d);onChanged?.(offer,"agreement_created");}catch(e){alert(e instanceof Error?e.message:"Unable to create agreement");}finally{setLoading(null);}};

  const statusLabel = offer.status === "withdrawn" ? "Withdrawn" : offer.status;

  return <div className="space-y-3 w-full max-w-md">
    <div className="w-full rounded-xl border border-primary/25 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center gap-2">
        <FileSignature size={17} className="text-primary"/>
        <div className="flex-1"><p className="font-semibold text-sm">Project Offer</p><p className="text-[11px] text-muted-foreground">{offer.serviceType}</p></div>
        <Badge className="text-[10px] bg-primary/10 text-primary border-0 capitalize">{statusLabel}</Badge>
      </div>
      <div className="p-4 space-y-3">
        <div><p className="text-xs text-muted-foreground">Project / Service</p><p className="font-medium text-sm">{offer.serviceName}</p></div>
        <div><p className="text-xs text-muted-foreground">Scope of Work</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.scope}</p></div>
        {offer.requirements&&<div><p className="text-xs text-muted-foreground">Requirements</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.requirements}</p></div>}
        <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Price</p><p className="text-lg font-bold text-primary">${offer.price}</p></div>{offer.deliveryEstimate&&<div><p className="text-xs text-muted-foreground">Delivery</p><p className="text-sm font-medium">{offer.deliveryEstimate}</p></div>}</div>
        {offer.terms&&<div><p className="text-xs text-muted-foreground">Terms / Notes</p><p className="text-sm whitespace-pre-wrap leading-5">{offer.terms}</p></div>}

        {canRespond&&offer.status==="sent"&&<div className="flex gap-2 pt-2">
          <Button onClick={()=>respond("accept")} disabled={!!loading} className="flex-1 gap-1.5"><Check size={14}/>{loading==="accept"?<Loader2 size={14} className="animate-spin"/>:"Accept Offer"}</Button>
          <Button variant="outline" onClick={()=>respond("decline")} disabled={!!loading} className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"><X size={14}/>{loading==="decline"?<Loader2 size={14} className="animate-spin"/>:"Decline Offer"}</Button>
        </div>}

        {isOwner&&offer.status==="sent"&&<Button onClick={()=>respond("withdraw")} disabled={!!loading} variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          {loading==="withdraw"?<Loader2 size={14} className="animate-spin"/>:<Ban size={14}/>} Withdraw Offer
        </Button>}

        {isOwner&&offer.status==="accepted"&&!agreement&&<Button onClick={createAgreement} disabled={!!loading} className="w-full gap-2 pt-2">{loading==="agreement"?<Loader2 size={14} className="animate-spin"/>:<FileSignature size={14}/>} Create & Send Agreement</Button>}
        {offer.status==="accepted"&&!isOwner&&!agreement&&<div className="rounded-lg bg-primary/10 text-primary text-sm px-3 py-2">Offer accepted. The project agreement is being prepared.</div>}
        {offer.status==="declined"&&<div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">This offer was declined.</div>}
        {offer.status==="withdrawn"&&<div className="rounded-lg bg-muted text-muted-foreground text-sm px-3 py-2">This offer has been withdrawn and can no longer be accepted or paid.</div>}
      </div>
    </div>
    {agreement&&<AgreementCard agreement={agreement} canAccept={!isOwner} onChanged={(a,next)=>{setAgreement(a);if(next==="payment")alert("Agreement accepted. Payment is the next step.");}}/>}
  </div>;
}
