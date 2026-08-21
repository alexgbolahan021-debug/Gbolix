import { describe, expect, it } from "vitest";
import { convertUsdCatalogPriceToNgn, type WalletExchangeRate } from "./walletExchangeRate";

const rate: WalletExchangeRate = {
  baseCurrency: "USD",
  quoteCurrency: "NGN",
  rate: 1600.25,
  provider: "test-provider",
  providerUpdatedAt: new Date("2026-08-20T00:00:00.000Z"),
  fetchedAt: new Date("2026-08-20T00:00:00.000Z"),
  expiresAt: new Date("2026-08-20T02:00:00.000Z"),
};

describe("Wallet USD-to-NGN checkout conversion", () => {
  it("rounds the USD catalog price to whole naira and produces Paystack kobo", () => {
    expect(convertUsdCatalogPriceToNgn(15, rate)).toEqual({ amountNgn: 24004, amountKobo: 2400400 });
  });

  it("rejects missing or invalid exchange rates before a payment order can be created", () => {
    expect(() => convertUsdCatalogPriceToNgn(15, { ...rate, rate: 0 })).toThrow("exchange rate is invalid");
  });
});
