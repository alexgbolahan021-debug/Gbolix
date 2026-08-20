import { describe, expect, it } from "vitest";
import { paystackVerificationPath } from "../../../gbolix/src/lib/paymentCallbackRouting";

describe("Paystack callback verification routing", () => {
  it("uses the Wallet verification endpoint for Wallet transaction references", () => {
    expect(paystackVerificationPath("GBX-WALLET-gwo_123-abcd"))
      .toBe("/api/wallet/payments/paystack/verify/GBX-WALLET-gwo_123-abcd");
  });

  it("keeps project-payment verification on the established endpoint", () => {
    expect(paystackVerificationPath("GBX-PAY-GBX-20260815-123"))
      .toBe("/api/payments/paystack/verify/GBX-PAY-GBX-20260815-123");
  });
});
