"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { tradingFetch } from "@/lib/clientId";

type Props = {
  market: string;
  symbol: string;
  name: string | null;
  price: number | null;
  currency: string | null;
};

type Side = "buy" | "sell";

export default function TradeModal(props: Props) {
  return (
    <Suspense fallback={<TradeButton />}>
      <TradeModalInner {...props} />
    </Suspense>
  );
}

function TradeButton() {
  return (
    <button
      disabled
      className="bg-emerald-600 text-white rounded px-3 py-1.5 text-xs font-semibold opacity-60"
    >
      Trade
    </button>
  );
}

function TradeModalInner(props: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState("");

  // Auto-open from query params: /s/MARKET/SYMBOL?trade=buy&hint=50%
  useEffect(() => {
    const trade = params.get("trade");
    const hint = params.get("hint");
    if (trade === "buy" || trade === "sell") {
      setSide(trade);
      setOpen(true);
      // Parse hint into a concrete qty when possible
      if (hint) {
        const pct = hint.match(/(\d+(?:\.\d+)?)\s*%/);
        const num = hint.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
        if (num) setQty(num[1]);
        // Percentage hints are resolved after the account loads (see other effect)
        else if (/^all$/i.test(hint)) setQty("__ALL__");
        else if (/^half$/i.test(hint)) setQty("__HALF__");
        else if (pct) setQty(`__PCT_${pct[1]}__`);
      }
      // Strip the params from the URL after handling so a reload doesn't re-open
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [cash, setCash] = useState<number | null>(null);
  const [heldQty, setHeldQty] = useState<number>(0);

  // Load account info when modal opens
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    (async () => {
      try {
        const r = await tradingFetch("/api/trading/account");
        const j = await r.json();
        const cashForCcy =
          props.currency === "INR" ? j.summary.cashInr : j.summary.cashUsd;
        setCash(cashForCcy);
        const held = (j.positions ?? []).find(
          (p: any) => p.market === props.market && p.symbol === props.symbol
        );
        const heldN = held ? Number(held.qty) : 0;
        setHeldQty(heldN);

        // Resolve qty_hint placeholders now that we know cash/held numbers.
        setQty((prev) => {
          if (prev === "__ALL__") return String(heldN || 0);
          if (prev === "__HALF__") return String(Math.floor((heldN || 0) / 2));
          const pct = prev.match(/^__PCT_(\d+(?:\.\d+)?)__$/);
          if (pct) {
            const p = parseFloat(pct[1]) / 100;
            if (side === "sell") return String(Math.floor(heldN * p));
            if (side === "buy" && props.price && props.price > 0) {
              const maxBuy = Math.floor(cashForCcy / props.price);
              return String(Math.floor(maxBuy * p));
            }
          }
          return prev;
        });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.market, props.symbol, props.currency]);

  const price = props.price ?? 0;
  const qtyNum = parseFloat(qty) || 0;
  const total = qtyNum * price;
  const symbol = props.currency === "INR" ? "₹" : "$";
  const affordableQty = side === "buy" && cash != null && price > 0 ? Math.floor(cash / price) : null;
  const maxSellable = heldQty;

  const submit = async () => {
    if (busy || !qtyNum) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await tradingFetch("/api/trading/order", {
        method: "POST",
        body: JSON.stringify({
          market: props.market,
          symbol: props.symbol,
          side,
          qty: qtyNum,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ text: j.error ?? "Order failed", tone: "err" });
      } else {
        setMsg({
          text: `${side === "buy" ? "Bought" : "Sold"} ${qtyNum} ${props.symbol} @ ${symbol}${j.execution.price.toFixed(2)}`,
          tone: "ok",
        });
        setQty("");
        // Refresh account after success
        const rr = await tradingFetch("/api/trading/account");
        const jj = await rr.json();
        setCash(props.currency === "INR" ? jj.summary.cashInr : jj.summary.cashUsd);
        const held = (jj.positions ?? []).find(
          (p: any) => p.market === props.market && p.symbol === props.symbol
        );
        setHeldQty(held ? Number(held.qty) : 0);
      }
    } catch (e: any) {
      setMsg({ text: e?.message ?? "Network error", tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-1.5 text-xs font-semibold"
      >
        Trade
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-[hsl(var(--card-fill))] rounded-xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">
                  Paper trade · {props.symbol}
                </div>
                <div className="text-xs text-foreground/60">
                  Live price {symbol}
                  {price.toFixed(2)} · {props.market}
                </div>
              </div>
              <button
                onClick={() => !busy && setOpen(false)}
                className="text-foreground/40 hover:text-foreground/80"
              >
                ✕
              </button>
            </div>

            {/* Buy/Sell toggle */}
            <div className="grid grid-cols-2 gap-1 bg-white/10 rounded-lg p-1 mb-3 text-sm">
              <button
                onClick={() => setSide("buy")}
                className={`rounded-md py-1.5 font-medium ${side === "buy" ? "bg-[hsl(var(--card-fill))] shadow-sm text-emerald-300" : "text-foreground/60"}`}
              >
                Buy
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`rounded-md py-1.5 font-medium ${side === "sell" ? "bg-[hsl(var(--card-fill))] shadow-sm text-rose-300" : "text-foreground/60"}`}
              >
                Sell
              </button>
            </div>

            {/* Context line */}
            <div className="flex items-center justify-between text-xs text-foreground/60 mb-1">
              <span>
                Cash available:{" "}
                <b className="text-foreground">
                  {cash != null ? `${symbol}${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "…"}
                </b>
              </span>
              <span>
                Held: <b className="text-foreground">{heldQty}</b>
              </span>
            </div>

            {/* Qty input */}
            <label className="text-xs text-foreground/60">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={side === "buy" ? `Max ${affordableQty ?? "—"}` : `Max ${maxSellable}`}
              className="w-full border border-white/15 rounded px-3 py-2 text-sm mb-1"
              min={0}
            />
            <div className="flex gap-1 mb-3">
              {[25, 50, 100].map((pct) => {
                const max = side === "buy" ? affordableQty ?? 0 : maxSellable;
                const n = Math.floor((max * pct) / 100);
                if (!n) return null;
                return (
                  <button
                    key={pct}
                    onClick={() => setQty(String(n))}
                    className="text-[11px] border border-white/10 rounded px-2 py-0.5 hover:bg-white/5"
                  >
                    {pct}% ({n})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-foreground/60">Estimated total</span>
              <span className="font-semibold">
                {symbol}
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            {msg && (
              <div
                className={`text-sm rounded-md px-3 py-2 mb-3 ${
                  msg.tone === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                }`}
              >
                {msg.text}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy || qtyNum <= 0}
              className={`w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                side === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {busy
                ? "Placing…"
                : side === "buy"
                  ? `Buy ${qtyNum || ""} ${props.symbol}`
                  : `Sell ${qtyNum || ""} ${props.symbol}`}
            </button>

            <p className="text-[11px] text-foreground/40 mt-3">
              Paper trading — no real money. Starting balance ₹10,00,000 + $10,000. Orders execute
              at the current Yahoo quote.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
