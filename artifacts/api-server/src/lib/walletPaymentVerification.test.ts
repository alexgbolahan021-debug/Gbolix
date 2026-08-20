import { describe, expect, it } from "vitest";
import { verifyWalletPaystackTransaction } from "./walletPaymentVerification";

describe("Wallet Paystack settlement verification", () => {
  it("uses Paystack requested_amount when customer-paid fees increase amount", () => {
    expect(verifyWalletPaystackTransaction({
      status: "success",
      currency: "NGN",
      requested_amount: 2_400_400,
      amount: 2_425_000,
    }, 24_004, "NGN")).toMatchObject({ verified: true, expectedAmountKobo: 2_400_400 });
  });

  it("falls back to amount when requested_amount is unavailable", () => {
    expect(verifyWalletPaystackTransaction({ status: "success", currency: "NGN", amount: 2_400_400 }, 24_004, "NGN"))
      .toMatchObject({ verified: true, requestedAmountKobo: null });
  });

  it("preserves failure details for an amount mismatch", () => {
    expect(verifyWalletPaystackTransaction({ status: "success", currency: "NGN", requested_amount: 2_400_500 }, 24_004, "NGN"))
      .toMatchObject({ verified: false, reason: "amount_mismatch" });
  });
});
