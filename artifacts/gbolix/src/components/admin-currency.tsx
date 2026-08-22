import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

export type AdminCurrency = "USD" | "NGN";

export type MoneyValue = { currency: string; amount: number };

export function convertMoney(value: MoneyValue, target: AdminCurrency, usdToNgnRate?: number | null): number | null {
  if (value.currency === target) return value.amount;
  if (!usdToNgnRate || usdToNgnRate <= 0) return null;
  if (value.currency === "USD" && target === "NGN") return value.amount * usdToNgnRate;
  if (value.currency === "NGN" && target === "USD") return value.amount / usdToNgnRate;
  return null;
}

export function formatMoney(values: MoneyValue[] | undefined, target: AdminCurrency, usdToNgnRate?: number | null) {
  if (!values?.length) return "—";
  const converted = values.map(value => convertMoney(value, target, usdToNgnRate));
  if (converted.some(value => value === null)) return "Unavailable";
  return `${target === "USD" ? "$" : "₦"}${converted.map(value => Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(` · ${target === "USD" ? "$" : "₦"}`)}`;
}

export function CurrencyToggle({ value, onChange }: { value: AdminCurrency; onChange: (value: AdminCurrency) => void }) {
  return <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1" aria-label="Display currency"><Button type="button" variant={value === "USD" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-[11px]" onClick={() => onChange("USD")}>USD</Button><Button type="button" variant={value === "NGN" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-[11px]" onClick={() => onChange("NGN")}>NGN</Button><ArrowLeftRight size={12} className="mx-1 text-muted-foreground" /></div>;
}

export function CurrencyDisplayDisclosure({ currency, exchangeRate }: { currency: AdminCurrency; exchangeRate?: { rate: number; source: string; fetchedAt: string } | null }) {
  if (!exchangeRate) {
    return <p className="text-xs text-yellow-400">{currency} display is active, but the current USD/NGN display rate is unavailable. Source amounts and NGN settlement records are unchanged.</p>;
  }
  const rate = exchangeRate.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const asOf = new Date(exchangeRate.fetchedAt).toLocaleString();
  return <p className="text-xs text-muted-foreground">Display only: $1 = ₦{rate} ({exchangeRate.source}, as of {asOf}). NGN Paystack settlement and verification remain unchanged; historical NGN payment totals shown in USD use this current display rate estimate.</p>;
}
