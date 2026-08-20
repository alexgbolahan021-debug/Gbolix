import { describe, expect, it } from "vitest";
import { checkoutErrorMessage } from "../../../gbolix/src/lib/walletCheckout";

describe("wallet checkout feedback", () => {
  it("preserves the actionable API error returned when checkout cannot initialize", () => {
    expect(checkoutErrorMessage(new Error("HTTP 503 Service Unavailable: Wallet checkout is not configured")))
      .toBe("HTTP 503 Service Unavailable: Wallet checkout is not configured");
  });

  it("provides a safe fallback message for unknown checkout failures", () => {
    expect(checkoutErrorMessage(null)).toBe("Unable to start secure checkout. Refresh the page and try again.");
  });
});
