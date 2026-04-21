// Number & currency formatters. Indian readers expect Lakh/Crore.

export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtMoney(
  n: number | null | undefined,
  currency: string | null | undefined
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const c = (currency || "USD").toUpperCase();
  if (c === "INR") {
    // Indian lakh/crore
    const abs = Math.abs(n);
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  // Short USD notation
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function fmtCurrencyPrice(
  n: number | null | undefined,
  currency: string | null | undefined
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const c = (currency || "USD").toUpperCase();
  const symbol = c === "INR" ? "₹" : c === "USD" ? "$" : "";
  return `${symbol}${n.toLocaleString(c === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function verdictChip(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v === "strong_buy") return "chip chip-strong";
  if (v === "buy") return "chip chip-buy";
  if (v === "hold") return "chip chip-hold";
  return "chip chip-avoid";
}

export function verdictLabel(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v === "strong_buy") return "Strong Buy";
  if (v === "buy") return "Buy";
  if (v === "hold") return "Hold";
  return "Avoid";
}
