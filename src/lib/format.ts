import { useAuth } from "@/lib/auth-context";

// Format numbers as currency. Defaults to KES.
export function formatMoney(value: number | string | null | undefined, currency = "KES") {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (Number.isNaN(n)) return `${currency} 0`;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMoneyRange(min: number, max: number, currency = "KES") {
  return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}

// Hook that formats amounts using the signed-in user's profile currency.
export function useMoney() {
  const { currency } = useAuth();
  return (value: number | string | null | undefined) => formatMoney(value, currency);
}
