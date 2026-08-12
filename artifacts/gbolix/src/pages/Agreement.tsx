import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, FileSignature, Loader2 } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { AgreementCard, type Agreement } from "@/components/AgreementCard";
import { customFetch } from "@workspace/api-client-react";

export default function AgreementPage() {
  const [, params] = useRoute("/agreement/:projectId");
  const [, navigate] = useLocation();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params?.projectId;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    customFetch<Agreement>(`/api/projects/${projectId}/agreement`, { responseType: "json" })
      .then(data => { if (!cancelled) setAgreement(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load the agreement"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  return <ClientLayout>
    <div className="min-h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <Button variant="ghost" onClick={() => navigate("/messages")} className="mb-6 gap-2 px-0 hover:bg-transparent hover:text-primary">
          <ArrowLeft size={16}/> Back to Messages
        </Button>

        <div className="mb-7 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileSignature size={20}/>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Gbolix Agreement</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Review your project agreement</h1>
            <p className="mt-1 text-sm text-muted-foreground">Review the scope, deliverables, timeline, price, and terms before accepting.</p>
          </div>
        </div>

        {loading && <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 size={22} className="animate-spin"/></div>}
        {!loading && error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {!loading && !error && agreement && <AgreementCard agreement={agreement} canAccept onChanged={(updated, nextStep) => { setAgreement(updated); if (nextStep === "payment") navigate("/messages"); }} />}
      </div>
    </div>
  </ClientLayout>;
}
