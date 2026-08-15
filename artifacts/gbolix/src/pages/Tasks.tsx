import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useListProjects } from "@workspace/api-client-react";
import { customFetch, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, ChevronRight, CreditCard, Loader2 } from "lucide-react";

const requestStatusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-400",
  needs_info: "bg-orange-500/10 text-orange-400",
  approved: "bg-primary/10 text-primary",
  declined: "bg-destructive/10 text-destructive",
  agreement_sent: "bg-blue-500/10 text-blue-400",
  agreement_accepted: "bg-blue-500/10 text-blue-400",
  queued: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-secondary/10 text-secondary",
  review: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-primary/10 text-primary",
};

const requestStatusLabel: Record<string, string> = {
  submitted: "Submitted",
  pending_review: "Pending Review",
  needs_info: "Needs More Info",
  approved: "Approved",
  declined: "Declined",
  agreement_sent: "Agreement Sent",
  agreement_accepted: "Agreement Accepted",
  queued: "Queued",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const paymentStatusColor: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  paid: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const paymentStatusLabel: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};

const priorityColor: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-400",
  high: "text-yellow-400",
  urgent: "text-destructive",
};

type ProjectWithPaymentStatus = {
  paymentStatus?: string | null;
};

type PaymentInitialization = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  paymentId?: number;
};

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [payingProjectId, setPayingProjectId] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: allProjects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() },
  });
  const projects = allProjects;

  const filtered = projects?.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (serviceFilter !== "all" && !p.serviceType.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
    return true;
  }) ?? [];

  const serviceTypes = [...new Set(projects?.map(t => t.serviceType) ?? [])];

  const startPayment = async (projectId: number) => {
    setPayingProjectId(projectId);
    setPaymentError(null);

    try {
      // Use the shared API client so the request gets both the Render API base
      // URL and the Clerk bearer token configured by App.tsx.
      const data = await customFetch<PaymentInitialization>(
        `/api/projects/${projectId}/payments/paystack/initialize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          responseType: "json",
        },
      );

      if (!data?.authorization_url) {
        throw new Error("Paystack did not return a checkout URL. Please try again.");
      }

      window.location.assign(data.authorization_url);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment");
      setPayingProjectId(null);
    }
  };

  return (
    <ClientLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-tasks-heading">My Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">Track your request and payment status separately.</p>
          </div>
          <Link href="/new-request">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm" data-testid="button-new-request">
              <Plus size={14} /> New Request
            </Button>
          </Link>
        </div>

        {paymentError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {paymentError}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-status-filter">
              <SelectValue placeholder="Request Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Request Status</SelectItem>
              {Object.entries(requestStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-48 h-9 text-sm" data-testid="select-status-filter">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="space-y-px">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted/30 animate-pulse" />)}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm mb-3">No tasks found.</p>
              <Link href="/new-request">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs" data-testid="button-submit-first-request">Submit your first request</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Request Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const paymentStatus = (p as typeof p & ProjectWithPaymentStatus).paymentStatus;
                    const canPay = p.status === "agreement_accepted" && paymentStatus === "pending";
                    const isPaying = payingProjectId === p.id;

                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors" data-testid={`row-task-${p.id}`}>
                        <td className="px-5 py-4">
                          <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.serviceType}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={`text-xs ${requestStatusColor[p.status] ?? "bg-muted text-muted-foreground"}`} data-testid={`badge-request-status-${p.id}`}>
                            {requestStatusLabel[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          {paymentStatus ? (
                            <Badge className={`text-xs ${paymentStatusColor[paymentStatus] ?? "bg-muted text-muted-foreground"}`} data-testid={`badge-payment-status-${p.id}`}>
                              {paymentStatusLabel[paymentStatus] ?? paymentStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium uppercase ${priorityColor[p.priority]}`}>{p.priority}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-primary font-medium">{p.price ? `$${p.price}` : "—"}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {canPay ? (
                              <Button
                                onClick={() => startPayment(p.id)}
                                disabled={isPaying}
                                size="sm"
                                className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                data-testid={`button-pay-${p.id}`}
                              >
                                {isPaying ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                                {isPaying ? "Opening..." : "Pay Now"}
                              </Button>
                            ) : p.hasConversation ? (
                              <Link href="/messages">
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" data-testid={`button-view-messages-${p.id}`}>
                                  Messages <ChevronRight size={12} />
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
