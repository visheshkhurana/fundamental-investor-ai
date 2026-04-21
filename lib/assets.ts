// Asset class taxonomy + helpers. Mirrors the Supabase `asset_class` enum.

export const ASSET_CLASSES = [
  "public_equity",
  "debt",
  "real_estate",
  "bullion",
  "crypto",
  "art",
  "alternates",
  "private_companies",
  "cash",
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  public_equity: "Public equity",
  debt: "Debt & fixed income",
  real_estate: "Real estate",
  bullion: "Gold & bullion",
  crypto: "Crypto",
  art: "Art & collectibles",
  alternates: "Alternates",
  private_companies: "Private / startup equity",
  cash: "Cash",
};

// Rough liquidity buckets used by allocation heuristics
export const LIQUIDITY_DAYS: Record<AssetClass, number> = {
  cash: 0,
  public_equity: 2,
  debt: 7,
  bullion: 3,
  crypto: 1,
  alternates: 30,
  real_estate: 180,
  art: 120,
  private_companies: 365,
};

// Subtypes we offer as dropdowns per class (free-text allowed too)
export const SUBTYPES: Partial<Record<AssetClass, string[]>> = {
  real_estate: ["primary_home", "rental", "land", "reit_direct"],
  debt: ["fd", "ppf", "epf", "nps", "bond", "debt_mf", "treasury"],
  bullion: ["physical_gold", "gold_etf", "sgb", "silver"],
  alternates: ["reit", "invit", "hedge_fund", "structured_product", "pe_fund"],
  private_companies: ["angel_investment", "own_startup", "employer_esop"],
  cash: ["savings", "checking", "liquid_fund"],
};

// USD conversion constant used across the app (same as signals.ts)
export const USD_PER_INR = 0.012;

export function toInr(valueInr?: number | null, valueUsd?: number | null): number {
  const a = valueInr ?? 0;
  const b = (valueUsd ?? 0) / USD_PER_INR;
  return a + b;
}

export function toUsd(valueInr?: number | null, valueUsd?: number | null): number {
  const a = (valueInr ?? 0) * USD_PER_INR;
  const b = valueUsd ?? 0;
  return a + b;
}
