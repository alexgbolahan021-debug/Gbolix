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

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2000;

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
    let timer: ReturnType<typeof setTimeout> | undefined;

    const verifyPayment = async (attempt: number) => {
      try {
        const result = await customFetch<VerificationResult>(
          `/api/payments/paystack/verify/${encodeURIComponent(reference)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            responseType: "json",
          },
        );

        if (cancelled) return;

        if (result.paid) {
          setState("paid");
          setMessage("Payment confirmed successfully. Your project is now in progress.");
          return;
        }

        if (attempt < MAX_ATTEMPTS) {
          setMessage("Payment received. Waiting for Paystack confirmation...");
          timer = setTimeout(() => verifyPayment(attempt + 1), RETRY_DELAY_MS);
          return;
        }

        setState("pending");
        setMessage("Your payment has not been confirmed yet. Please wait a moment and check again, or return to your tasks.");
      } catch (error) {
        if (cancelled) return;

        if (attempt < MAX_ATTEMPTS) {
          setMessage("Still confirming your payment...");
          timer = setTimeout(() => verifyPayment(attempt + 1), RETRY_DELAY_MS);
          return;
        }

        setState("failed");
        setMessage(error instanceof Error ? error.message : "We could not confirm the payment. Please try again.");
      }
    };

    verifyPayment(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const retry = () => {
    window.location.reload();
  };

  return (
    <ClientLayout>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          {state === "checking" && <Loader2 size={48} className="mx-auto mb-5 animate-spin text-primary" />}
          {state === "paid" && <CheckCircle2 size={48} className="mx-auto mb-5 text-emerald-400" />}
          {(state === "pending" || state === "failed") && <XCircle size={48} className="mx-auto mb-5 text-destructive" />}
          <h1 className="text-2xl font-bold">
            {state === "checking"
              ? "Confirming Payment"
              : state === "paid"
                ? "Payment Successful"
                : state === "pending"
                  ? "Payment Not Yet Confirmed"
                  : "Payment Confirmation Failed"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          {state !== "checking" && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/tasks")}>Go to Tasks</Button>
              {state !== "paid" && <Button variant="outline" onClick={retry}>Check Again</Button>}
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
