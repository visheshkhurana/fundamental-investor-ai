import { ImageResponse } from "next/og";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";

export const runtime = "nodejs";
export const alt = "Fundamental Investor AI — stock score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Module-level cache so the font fetches once per cold start, not per request.
let _fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;
  // Open Sans Regular — 147KB static TTF, contains the Indian Rupee glyph
  // (U+20B9). Default Satori fonts render ₹ as tofu.
  // Roboto has a confirmed Indian Rupee glyph. 515KB cached per cold start.
  const url =
    "https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf";
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  _fontCache = buf;
  return buf;
}

const VERDICT: Record<string, { label: string; fg: string; bg: string }> = {
  strong_buy: { label: "Strong Buy", fg: "#065F46", bg: "#D1FAE5" },
  buy: { label: "Buy", fg: "#1E40AF", bg: "#DBEAFE" },
  hold: { label: "Hold", fg: "#854D0E", bg: "#FEF3C7" },
  avoid: { label: "Avoid", fg: "#991B1B", bg: "#FEE2E2" },
};

export default async function OGImage({
  params,
}: {
  params: { market: string; symbol: string };
}) {
  const market = params.market.toUpperCase();
  const symbol = params.symbol.toUpperCase();

  let total = "—";
  let verdictKey = "hold";
  let name = symbol;
  let priceStr = "";
  let piotro = "—";
  let altman = "—";
  let moat = "—";

  try {
    const [quote, fund] = await Promise.all([
      fetchQuote(market, symbol),
      fetchFundamentals(market, symbol),
    ]);
    if (fund) {
      const s = scoreStock(fund, quote?.price ?? null);
      total = s.total.toFixed(1);
      verdictKey = s.verdict;
      piotro = `${s.advanced.piotroski.score}/9`;
      altman = s.advanced.altmanZ.score != null ? s.advanced.altmanZ.score.toFixed(2) : "—";
      moat = s.advanced.moat.strength;
    }
    if (quote?.name) name = quote.name;
    if (quote?.price != null) {
      const c = quote.currency ?? fund?.currency ?? "";
      const sym = c === "INR" ? "₹" : c === "USD" ? "$" : "";
      priceStr = `${sym}${quote.price.toFixed(2)}`;
    }
  } catch {
    // Render fallback below
  }

  const v = VERDICT[verdictKey] ?? VERDICT.hold;

  let fonts: any = undefined;
  try {
    const data = await loadFont();
    fonts = [{ name: "Roboto", data, weight: 400, style: "normal" }];
  } catch {
    // If font fetch fails, fall back to default — ₹ may render as tofu but
    // image still generates.
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
          color: "white",
          padding: "56px 64px",
          fontFamily: "'Roboto', system-ui, -apple-system, Segoe UI",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, opacity: 0.9 }}>
          <div style={{ display: "flex", fontSize: 34, marginRight: 14 }}>📈</div>
          <div style={{ display: "flex", fontWeight: 700 }}>Fundamental Investor AI</div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 30,
          }}
        >
          {/* Left: stock info */}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ display: "flex", fontSize: 110, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
                {symbol}
              </div>
              <div
                style={{
                  display: "flex",
                  marginLeft: 18,
                  fontSize: 24,
                  padding: "4px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                }}
              >
                {market}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 36, opacity: 0.88, marginTop: 8, maxWidth: 620 }}>
              {name}
            </div>
            {priceStr && (
              <div style={{ display: "flex", fontSize: 32, marginTop: 28, opacity: 0.9 }}>
                {priceStr}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 22, marginTop: 24, opacity: 0.75 }}>
              Piotroski {piotro}   ·   Altman Z {altman}   ·   Moat: {moat}
            </div>
          </div>

          {/* Right: score card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 300,
              height: 300,
              borderRadius: 300,
              background: "rgba(255,255,255,0.06)",
              border: "4px solid rgba(255,255,255,0.15)",
            }}
          >
            <div style={{ display: "flex", fontSize: 22, opacity: 0.65, marginBottom: -6 }}>Score</div>
            <div style={{ display: "flex", fontSize: 136, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>
              {total}
            </div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.55, marginTop: -2 }}>/ 10</div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 26,
                padding: "6px 18px",
                borderRadius: 999,
                background: v.bg,
                color: v.fg,
                fontWeight: 700,
              }}
            >
              {v.label}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 20,
            opacity: 0.55,
            marginTop: 16,
          }}
        >
          <div style={{ display: "flex" }}>Macro · Industry · Company · Valuation · Triggers</div>
          <div style={{ display: "flex" }}>fundamental-investor-ai.vercel.app</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
