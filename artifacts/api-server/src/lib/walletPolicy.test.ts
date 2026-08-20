import { describe, expect, it } from "vitest";
import { approvedCreditPacks, calculateChargeableLeadCredits, calculateReleasedCredits, canUseProduct, QUALIFIED_LEAD_CREDIT_COST } from "./walletPolicy";

describe("Gbolix Wallet v1.0 credit packs", () => {
  it("uses the approved non-expiring Wallet v1.0 credit-pack pricing", () => {
    expect(approvedCreditPacks).toEqual([
      { packKey: "starter-100", displayName: "Starter Pack", credits: 100, price: "15.00", currency: "USD", badge: null, sortOrder: 10 },
      { packKey: "growth-250", displayName: "Growth Pack", credits: 250, price: "29.00", currency: "USD", badge: null, sortOrder: 20 },
      { packKey: "professional-500", displayName: "Professional Pack", credits: 500, price: "49.00", currency: "USD", badge: "Most Popular", sortOrder: 30 },
      { packKey: "scale-1000", displayName: "Scale Pack", credits: 1000, price: "89.00", currency: "USD", badge: "Best Value", sortOrder: 40 },
    ]);
  });
});

describe("Gbolix Leads credit policy", () => {
  it("charges one credit for each measured new qualified lead", () => {
    expect(QUALIFIED_LEAD_CREDIT_COST).toBe(1);
    expect(calculateChargeableLeadCredits({ newQualifiedLeads: 25, duplicatesSuppressed: 0 })).toBe(25);
  });

  it("does not charge duplicate leads when the engine reports measured new qualified output", () => {
    expect(calculateChargeableLeadCredits({ newQualifiedLeads: 40, duplicatesSuppressed: 10 })).toBe(40);
  });

  it("returns unused reserved credits after final lead usage", () => {
    expect(calculateReleasedCredits(50, 40)).toBe(10);
    expect(calculateReleasedCredits(500, 0)).toBe(500);
  });

  it("rejects invalid final usage above the reserved maximum", () => {
    expect(() => calculateReleasedCredits(25, 26)).toThrow("within the reserved maximum");
  });

  it("allows only active or trialing product entitlement to start a Leads request", () => {
    expect(canUseProduct("active")).toBe(true);
    expect(canUseProduct("trialing")).toBe(true);
    expect(canUseProduct("inactive")).toBe(false);
    expect(canUseProduct("suspended")).toBe(false);
  });
});
