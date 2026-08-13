import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { customFetch } from "@workspace/api-client-react";

type VerificationResult = {
  paid: boolean;
  payment?: { reference?: string; status?: string };
  status?: string;
  error?: string;
};

export default function PaymentCallback() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [message, setMessage] = useState("Confirming your payment with Paystack...");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) {
      setState("failed");
      setMessage("No Paystack payment reference was found.");
      return;
    }

    let cancelled = false;
    customFetch<VerificationResult>(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      responseType: "json",
    })
      .then(result => {
        if (cancelled) return;
        if (result.paid) {
          setState("paid");
          setMessage("Payment confirmed successfully. Your project is now in progress.");
        } else {
          setState("pending");
          setMessage("Paystack has not confirmed this payment yet. You can return to your project and try again if needed.");
        }
      })
      .catch(error => {
        if (cancelled) return;
        setState("failed");
        setMessage(error instanceof Error ? error.message : "We could not confirm the payment. Please try again.");
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <ClientLayout>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          {state === "checking" && <Loader2 size={48} className="mx-auto mb-5 animate-spin text-primary" />}
          {state === "paid" && <CheckCircle2 size={48} className="mx-auto mb-5 text-emerald-400" />}
          {(state === "pending" || state === "failed") && <XCircle size={48} className="mx-auto mb-5 text-destructive" />}
          <h1 className="text-2xl font-bold">{state === "checking" ? "Confirming Payment" : state === "paid" ? "Payment Successful" : state === "pending" ? "Payment Not Yet Confirmed" : "Payment Confirmation Failed"}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          {state !== "checking" && <div className="mt-6 flex justify-center gap-3"><Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>{state !== "paid" && <Button variant="outline" onClick={() => navigate("/messages")}>Return to Project</Button>}</div>}
        </div>
      </div>
    </ClientLayout>
  );
}
