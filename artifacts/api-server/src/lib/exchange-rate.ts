const DEFAULT_RATE_URL = "https://open.er-api.com/v6/latest/USD";
const DEFAULT_TTL_MS = 3 * 60 * 60 * 1000;
const DEFAULT_MAX_STALE_MS = 6 * 60 * 60 * 1000;

export type CachedExchangeRate = {
  base: "USD";
  quote: "NGN";
  rate: number;
  fetchedAt: number;
  source: string;
};

let cachedRate: CachedExchangeRate | null = null;
let refreshPromise: Promise<CachedExchangeRate> | null = null;

function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function ttlMs() {
  return numericEnv("FX_RATE_CACHE_TTL_MS", DEFAULT_TTL_MS);
}

function maxStaleMs() {
  return numericEnv("FX_RATE_MAX_STALE_MS", DEFAULT_MAX_STALE_MS);
}

function manualRate() {
  const value = Number(process.env.USD_NGN_RATE);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function validateRate(value: unknown): number {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Exchange-rate provider returned an invalid USD/NGN rate");
  return rate;
}

export async function refreshUsdToNgnRate(): Promise<CachedExchangeRate> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const configuredRate = manualRate();
    if (configuredRate) {
      const next: CachedExchangeRate = { base: "USD", quote: "NGN", rate: configuredRate, fetchedAt: Date.now(), source: "USD_NGN_RATE" };
      cachedRate = next;
      return next;
    }

    const url = process.env.FX_RATE_URL || DEFAULT_RATE_URL;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Exchange-rate provider returned HTTP ${response.status}`);
    const payload = await response.json() as { rates?: { NGN?: number }; conversion_rates?: { NGN?: number } };
    const rate = validateRate(payload.rates?.NGN ?? payload.conversion_rates?.NGN);
    const next: CachedExchangeRate = { base: "USD", quote: "NGN", rate, fetchedAt: Date.now(), source: url };
    cachedRate = next;
    return next;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function getCachedUsdToNgnRate(): Promise<CachedExchangeRate> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < ttlMs()) return cachedRate;

  try {
    return await refreshUsdToNgnRate();
  } catch (error) {
    if (cachedRate && Date.now() - cachedRate.fetchedAt <= maxStaleMs()) {
      console.warn("Using stale USD/NGN exchange rate after refresh failure", error);
      return cachedRate;
    }
    throw new Error("Exchange rate is unavailable or too stale to start a payment");
  }
}

export function usdToNgnMajorUnits(usdAmount: number, rate: number): number {
  const amount = Math.round(usdAmount * rate * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Converted NGN payment amount is invalid");
  return amount;
}

export function toPaystackSubunit(amountMajorUnits: number): number {
  const amount = Math.round(amountMajorUnits * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Paystack subunit amount is invalid");
  return amount;
}

export function startExchangeRateRefresh() {
  void refreshUsdToNgnRate().catch(error => console.warn("Initial USD/NGN exchange-rate refresh failed", error));
  const interval = setInterval(() => {
    void refreshUsdToNgnRate().catch(error => console.warn("Scheduled USD/NGN exchange-rate refresh failed", error));
  }, ttlMs());
  interval.unref?.();
  return interval;
}
