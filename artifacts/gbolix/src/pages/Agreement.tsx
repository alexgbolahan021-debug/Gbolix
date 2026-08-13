import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { AgreementCard, type Agreement } from "@/components/AgreementCard";
import { customFetch, useGetMe } from "@workspace/api-client-react";

export default function AgreementPage() {
  const [, params] = useRoute("/agreement/:agreementId");
  const [, navigate] = useLocation();
  const { data: me } = useGetMe();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const agreementId = params?.agreementId;
  const canAccept = me?.role === "client";

  useEffect(() => {
    if (!agreementId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    customFetch<Agreement>(`/api/agreements/${agreementId}`, { responseType: "json" })
      .then(data => { if (!cancelled) setAgreement(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load the agreement"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [agreementId]);

  const handleAgreementChanged = async (updated: Agreement, nextStep?: string) => {
    setAgreement(updated);
    if (nextStep !== "payment") return;

    setPaymentError(null);
    setPaymentLoading(true);
    try {
      const payment = await customFetch<{ authorization_url?: string }>(
        `/api/projects/${updated.projectId}/payments/paystack/initialize`,
        { method: "POST", headers: { "Content-Type": "application/json" }, responseType: "json" },
      );

      if (!payment.authorization_url) {
        throw new Error("Paystack did not return a secure checkout URL. Please try again.");
      }

      window.location.assign(payment.authorization_url);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Unable to start secure payment. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return <ClientLayout printable>
    <div className="min-h-full overflow-y-auto print:min-h-0 print:overflow-visible">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10 print:max-w-none print:px-0 print:py-0">
        <Button variant="ghost" onClick={() => navigate("/messages")} className="mb-6 gap-2 px-0 hover:bg-transparent hover:text-primary print:hidden">
          <ArrowLeft size={16}/> Back to Messages
        </Button>

        {loading && <div className="flex min-h-48 items-center justify-center text-muted-foreground print:hidden"><Loader2 size={22} className="animate-spin"/></div>}
        {!loading && error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">{error}</div>}
        {!loading && !error && agreement && <>
          {paymentError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">{paymentError}</div>}
          {paymentLoading && <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary print:hidden"><Loader2 size={16} className="animate-spin"/> Preparing secure Paystack checkout...</div>}
          <AgreementCard agreement={agreement} canAccept={canAccept && !paymentLoading} onChanged={handleAgreementChanged} />
        </>}
      </div>
    </div>
  </ClientLayout>;
}
