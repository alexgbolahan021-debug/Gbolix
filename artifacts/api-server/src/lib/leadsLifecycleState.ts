export type LeadRequestStatus =
  | "queued"
  | "running"
  | "partially_complete"
  | "results_ready"
  | "finalizing_credit"
  | "completed"
  | "cancel_requested"
  | "cancelled"
  | "failed";

export function statusAfterSuccessfulLeadDispatch(currentStatus: LeadRequestStatus): LeadRequestStatus {
  return currentStatus === "queued" ? "running" : currentStatus;
}

export function statusAfterUsageFinalized(currentStatus: LeadRequestStatus): LeadRequestStatus {
  return currentStatus === "completed" ? currentStatus : "completed";
}
