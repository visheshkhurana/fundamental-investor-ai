"use client";
import Link from "next/link";

export type Action = {
  label: string;
  market: string;
  symbol: string;
  side: "buy" | "sell";
  qty_hint?: string;
  rationale: string;
};

// Parse a response where a fenced ```json block appears at the START, followed
// by prose. Returns { body, actions }.
// If the JSON block is still streaming (incomplete), returns { body: "", actions: [] }
// so the UI doesn't flash partial content before the JSON finishes.
export function parseReview(raw: string): { body: string; actions: Action[] } {
  const leading = raw.match(/^\s*```json\s*([\s\S]*?)```\s*/);
  if (leading) {
    const body = raw.slice(leading[0].length).trim();
    try {
      const parsed = JSON.parse(leading[1]);
      const actions = Array.isArray(parsed?.actions) ? (parsed.actions as Action[]) : [];
      return { body, actions };
    } catch {
      // JSON block malformed — fall through to no-JSON path
      return { body, actions: [] };
    }
  }
  // Fallback: JSON at the end (old format) or no JSON at all
  const trailing = raw.match(/```json\s*([\s\S]*?)```\s*$/);
  if (trailing) {
    const body = raw.slice(0, trailing.index).trim();
    try {
      const parsed = JSON.parse(trailing[1]);
      const actions = Array.isArray(parsed?.actions) ? (parsed.actions as Action[]) : [];
      return { body, actions };
    } catch {
      return { body: raw.trim(), actions: [] };
    }
  }
  // Still streaming the opening JSON block — hide body until it closes
  if (raw.match(/^\s*```json/) && !raw.match(/```json[\s\S]*?```/)) {
    return { body: "", actions: [] };
  }
  return { body: raw.trim(), actions: [] };
}

export default function SuggestedMoves({ actions }: { actions: Action[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <div className="text-xs uppercase tracking-wide text-foreground/40 mb-2">
        Actionable moves
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <ActionCard key={i} action={a} />
        ))}
      </div>
      <p className="text-[11px] text-foreground/40 mt-3">
        Each button opens the stock's full dashboard with the trade modal pre-filled. You always
        confirm the final order — nothing trades automatically.
      </p>
    </div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const isSell = action.side === "sell";
  const sideClass = isSell ? "chip chip-avoid" : "chip chip-strong";
  // Deep-link to the stock page with query params. Stock page will read these
  // and auto-open TradeModal with preset side + qty.
  const href = `/s/${action.market}/${action.symbol}?trade=${action.side}${
    action.qty_hint ? `&hint=${encodeURIComponent(action.qty_hint)}` : ""
  }`;
  return (
    <div className="border border-white/10 rounded-lg p-3 hover:bg-white/5 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={sideClass}>{action.side.toUpperCase()}</span>
            <span className="font-semibold">{action.symbol}</span>
            <span className="text-xs text-foreground/40">· {action.market}</span>
            {action.qty_hint && (
              <span className="text-xs text-foreground/60 ml-1">· {action.qty_hint}</span>
            )}
          </div>
          <div className="text-sm font-medium">{action.label}</div>
          <p className="text-xs text-foreground/70 mt-1 leading-snug">{action.rationale}</p>
        </div>
        <Link
          href={href}
          className={`whitespace-nowrap text-xs rounded px-3 py-2 font-semibold ${
            isSell ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {isSell ? "Trim / sell →" : "Buy →"}
        </Link>
      </div>
    </div>
  );
}
