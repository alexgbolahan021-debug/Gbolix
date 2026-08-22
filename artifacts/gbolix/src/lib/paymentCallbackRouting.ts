const WALLET_REFERENCE_PREFIX = "GBX-WALLET-";
export const AI_AGENT_SUBSCRIPTION_REFERENCE_PREFIX = "GBX-AI-SUB-";

export function isWalletPaymentReference(reference: string) {
  return reference.startsWith(WALLET_REFERENCE_PREFIX);
}

export function isAIAgentSubscriptionReference(reference: string) {
  return reference.startsWith(AI_AGENT_SUBSCRIPTION_REFERENCE_PREFIX);
}

export function paystackVerificationPath(reference: string) {
  if (isWalletPaymentReference(reference)) return `/api/wallet/payments/paystack/verify/${encodeURIComponent(reference)}`;
  if (isAIAgentSubscriptionReference(reference)) return `/api/ai-agent/subscriptions/payments/paystack/verify/${encodeURIComponent(reference)}`;
  return `/api/payments/paystack/verify/${encodeURIComponent(reference)}`;
}
