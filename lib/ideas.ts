// Idea ranking: scores a candidate against a user's inferred preferences.
// Pure function. No I/O. Easy to unit-test.

export type ScoredCandidate = {
  market: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  total_score: number;
  verdict: string;
  prev_score: number | null;            // from older score_cache snapshot, if we have one
  moat_strength: string | null;
  piotroski: number | null;
  peg: number | null;
  pe: number | null;
};

export type UserTilt = {
  ownedSectors: Set<string>;           // sectors user already holds (overweight avoidance)
  underweightSectors: Set<string>;     // sectors we want them to add
  dismissedTickers: Set<string>;       // `${market}/${symbol}`
  ownedTickers: Set<string>;           // don't recommend what they already hold
  preferredStyles: Set<string>;        // 'value' | 'quality' | 'growth'
  hasPositiveNews: (market: string, symbol: string) => boolean;
};

export function rankIdea(c: ScoredCandidate, t: UserTilt): number {
  const key = `${c.market}/${c.symbol}`;
  if (t.ownedTickers.has(key) || t.dismissedTickers.has(key)) return -Infinity;

  let score = 0;

  // Base: the framework's own opinion
  score += c.total_score;                                      // 0..10

  // Verdict bonus
  if (c.verdict === "strong_buy") score += 2;
  else if (c.verdict === "buy") score += 1;
  else if (c.verdict === "avoid") score -= 4;

  // Sector balance — reward names that diversify away
  if (c.sector) {
    if (t.underweightSectors.has(c.sector)) score += 3;
    else if (t.ownedSectors.has(c.sector)) score -= 1;
  }

  // Style match — reward picks that look like past winners for this user
  const style = classifyStyle(c);
  if (style && t.preferredStyles.has(style)) score += 1;

  // Score uptick vs last time (fundamental momentum)
  if (c.prev_score != null && c.total_score > c.prev_score + 0.5) score += 2;

  // News sentiment bonus
  if (t.hasPositiveNews(c.market, c.symbol)) score += 1;

  return score;
}

// Same priority order as lib/style.ts: quality > value > growth
function classifyStyle(c: ScoredCandidate): "quality" | "value" | "growth" | null {
  if (
    (c.piotroski ?? 0) >= 7 &&
    (c.moat_strength === "wide" || c.moat_strength === "narrow")
  ) {
    return "quality";
  }
  if (c.peg != null && c.peg > 0 && c.peg < 1.2) return "value";
  if (c.pe != null && c.pe > 30) return "growth";
  return null;
}

export function reasonTags(c: ScoredCandidate, t: UserTilt): string[] {
  const tags: string[] = [];
  if (c.verdict === "strong_buy") tags.push("strong-buy");
  if (c.prev_score != null && c.total_score > c.prev_score + 0.5) tags.push("score-uptick");
  if (c.sector && t.underweightSectors.has(c.sector)) tags.push("diversifier");
  if (t.hasPositiveNews(c.market, c.symbol)) tags.push("news-tailwind");
  if (c.moat_strength === "wide") tags.push("wide-moat");
  if (c.peg != null && c.peg > 0 && c.peg < 1) tags.push("peg-undervalued");
  return tags;
}
