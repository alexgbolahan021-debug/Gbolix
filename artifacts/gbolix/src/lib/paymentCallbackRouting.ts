const WALLET_REFERENCE_PREFIX = "GBX-WALLET-";

export function isWalletPaymentReference(reference: string) {
  return reference.startsWith(WALLET_REFERENCE_PREFIX);
}

export function paystackVerificationPath(reference: string) {
  return isWalletPaymentReference(reference)
    ? `/api/wallet/payments/paystack/verify/${encodeURIComponent(reference)}`
    : `/api/payments/paystack/verify/${encodeURIComponent(reference)}`;
}
