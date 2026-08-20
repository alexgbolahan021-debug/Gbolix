type PaystackTransaction = {
  status?: unknown;
  currency?: unknown;
  amount?: unknown;
  requested_amount?: unknown;
};

export type WalletPaymentVerification = {
  verified: boolean;
  reason?: "transaction_not_successful" | "amount_mismatch" | "currency_mismatch";
  expectedAmountKobo: number;
  requestedAmountKobo: number | null;
  chargedAmountKobo: number | null;
};

export function verifyWalletPaystackTransaction(
  transaction: PaystackTransaction | undefined,
  expectedAmountNgn: number,
  expectedCurrency: string,
): WalletPaymentVerification {
  const expectedAmountKobo = Math.round(expectedAmountNgn * 100);
  const requestedAmount = Number(transaction?.requested_amount);
  const chargedAmount = Number(transaction?.amount);
  const requestedAmountKobo = Number.isFinite(requestedAmount) ? requestedAmount : null;
  const chargedAmountKobo = Number.isFinite(chargedAmount) ? chargedAmount : null;

  // Paystack may include customer-paid fees in `amount`. When available,
  // `requested_amount` is the merchant amount initialized by Gbolix and is
  // the amount that must match the stored Wallet order.
  const amountMatches = requestedAmountKobo !== null
    ? requestedAmountKobo === expectedAmountKobo
    : chargedAmountKobo === expectedAmountKobo;
  const transactionSucceeded = transaction?.status === "success";
  const currencyMatches = transaction?.currency === expectedCurrency;

  if (!transactionSucceeded) {
    return { verified: false, reason: "transaction_not_successful", expectedAmountKobo, requestedAmountKobo, chargedAmountKobo };
  }
  if (!amountMatches) {
    return { verified: false, reason: "amount_mismatch", expectedAmountKobo, requestedAmountKobo, chargedAmountKobo };
  }
  if (!currencyMatches) {
    return { verified: false, reason: "currency_mismatch", expectedAmountKobo, requestedAmountKobo, chargedAmountKobo };
  }
  return { verified: true, expectedAmountKobo, requestedAmountKobo, chargedAmountKobo };
}
