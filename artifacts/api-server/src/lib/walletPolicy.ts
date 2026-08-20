export const GBOLIX_LEADS_PRODUCT_KEY = "gbolix-leads";
export const QUALIFIED_LEAD_CREDIT_COST = 1;
export const CREDIT_AUTHORIZATION_TTL_MS = 30 * 60 * 1000;

export const approvedCreditPacks = [
  { packKey: "starter-100", displayName: "Starter Pack", credits: 100, price: "15.00", currency: "USD", badge: null, sortOrder: 10 },
  { packKey: "growth-250", displayName: "Growth Pack", credits: 250, price: "29.00", currency: "USD", badge: null, sortOrder: 20 },
  { packKey: "professional-500", displayName: "Professional Pack", credits: 500, price: "49.00", currency: "USD", badge: "Most Popular", sortOrder: 30 },
  { packKey: "scale-1000", displayName: "Scale Pack", credits: 1000, price: "89.00", currency: "USD", badge: "Best Value", sortOrder: 40 },
] as const;

export type LeadUsageInput = {
  newQualifiedLeads: number;
  duplicatesSuppressed: number;
};

export function calculateChargeableLeadCredits(input: LeadUsageInput): number {
  if (!Number.isInteger(input.newQualifiedLeads) || input.newQualifiedLeads < 0) throw new Error("newQualifiedLeads must be a non-negative integer");
  if (!Number.isInteger(input.duplicatesSuppressed) || input.duplicatesSuppressed < 0) throw new Error("duplicatesSuppressed must be a non-negative integer");
  return input.newQualifiedLeads * QUALIFIED_LEAD_CREDIT_COST;
}

export function calculateReleasedCredits(maximumCredits: number, finalizedCredits: number): number {
  if (!Number.isInteger(maximumCredits) || maximumCredits < 0) throw new Error("maximumCredits must be a non-negative integer");
  if (!Number.isInteger(finalizedCredits) || finalizedCredits < 0 || finalizedCredits > maximumCredits) throw new Error("finalizedCredits must be within the reserved maximum");
  return maximumCredits - finalizedCredits;
}

export function canUseProduct(entitlementStatus: string | null | undefined): boolean {
  return entitlementStatus === "trialing" || entitlementStatus === "active";
}
