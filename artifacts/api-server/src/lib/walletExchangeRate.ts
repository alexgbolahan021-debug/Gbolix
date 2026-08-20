import { and, eq } from "drizzle-orm";
import { db, walletExchangeRatesTable } from "@workspace/db";
import { WalletError } from "./walletService";

const BASE_CURRENCY = "USD";
const QUOTE_CURRENCY = "NGN";
const PROVIDER = "exchange-rate-api-open";
const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD";
const RATE_TTL_MS = 2 * 60 * 60 * 1000;

export type WalletExchangeRate = {
  baseCurrency: "USD";
  quoteCurrency: "NGN";
  rate: number;
  provider: string;
  providerUpdatedAt: Date | null;
  fetchedAt: Date;
  expiresAt: Date;
};

function normalizeRate(row: typeof walletExchangeRatesTable.$inferSelect): WalletExchangeRate {
  return {
    baseCurrency: BASE_CURRENCY,
    quoteCurrency: QUOTE_CURRENCY,
    rate: Number(row.rate),
    provider: row.provider,
    providerUpdatedAt: row.providerUpdatedAt,
    fetchedAt: row.fetchedAt,
    expiresAt: row.expiresAt,
  };
}

export function convertUsdCatalogPriceToNgn(usdAmount: number, rate: WalletExchangeRate) {
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) throw new WalletError("INVALID_CATALOG_PRICE", "Wallet pack price is invalid", 500);
  if (!Number.isFinite(rate.rate) || rate.rate <= 0) throw new WalletError("FX_RATE_INVALID", "The exchange rate is invalid", 503);

  // Paystack accepts NGN in kobo. We round the customer-facing price to the nearest naira,
  // then convert it to the required kobo subunit without floating-point fractions.
  const amountNgn = Math.round(usdAmount * rate.rate);
  if (!Number.isSafeInteger(amountNgn) || amountNgn <= 0) throw new WalletError("FX_CONVERSION_INVALID", "The converted checkout amount is invalid", 503);
  return { amountNgn, amountKobo: amountNgn * 100 };
}

async function fetchUsdToNgnRate(now: Date): Promise<WalletExchangeRate> {
  let response: globalThis.Response;
  try {
    response = await fetch(PROVIDER_URL, { signal: AbortSignal.timeout(7_500) });
  } catch {
    throw new WalletError("FX_RATE_UNAVAILABLE", "Naira checkout is temporarily unavailable. Please try again shortly.", 503);
  }

  if (!response.ok) throw new WalletError("FX_RATE_UNAVAILABLE", "Naira checkout is temporarily unavailable. Please try again shortly.", 503);
  const payload = await response.json() as {
    result?: string;
    base_code?: string;
    rates?: Record<string, number>;
    time_last_update_unix?: number;
  };
  const rate = payload?.rates?.[QUOTE_CURRENCY];
  if (payload?.result !== "success" || payload?.base_code !== BASE_CURRENCY || typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new WalletError("FX_RATE_UNAVAILABLE", "Naira checkout is temporarily unavailable. Please try again shortly.", 503);
  }

  const providerUpdatedAt = payload.time_last_update_unix ? new Date(payload.time_last_update_unix * 1000) : null;
  const expiresAt = new Date(now.getTime() + RATE_TTL_MS);
  const values = {
    baseCurrency: BASE_CURRENCY,
    quoteCurrency: QUOTE_CURRENCY,
    rate: rate.toFixed(8),
    provider: PROVIDER,
    providerUpdatedAt,
    fetchedAt: now,
    expiresAt,
    updatedAt: now,
  };
  const [saved] = await db.insert(walletExchangeRatesTable).values(values).onConflictDoUpdate({
    target: [walletExchangeRatesTable.baseCurrency, walletExchangeRatesTable.quoteCurrency],
    set: values,
  }).returning();
  if (!saved) throw new WalletError("FX_RATE_UNAVAILABLE", "Naira checkout is temporarily unavailable. Please try again shortly.", 503);
  return normalizeRate(saved);
}

export async function getUsdToNgnRate(now = new Date()): Promise<WalletExchangeRate> {
  const [cached] = await db.select().from(walletExchangeRatesTable).where(and(
    eq(walletExchangeRatesTable.baseCurrency, BASE_CURRENCY),
    eq(walletExchangeRatesTable.quoteCurrency, QUOTE_CURRENCY),
  )).limit(1);

  if (cached && cached.expiresAt.getTime() > now.getTime()) return normalizeRate(cached);
  return fetchUsdToNgnRate(now);
}
