"use client";
import { useEffect, useRef, useState } from "react";

const RANGES: { id: string; label: string }[] = [
  { id: "1mo", label: "1M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
  { id: "max", label: "Max" },
];

export default function PriceChart({
  market,
  symbol,
}: {
  market: string;
  symbol: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [range, setRange] = useState("1y");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("");

  // Create chart once
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    (async () => {
      const lwc = await import("lightweight-charts");
      if (cancelled) return;
      const chart = lwc.createChart(ref.current!, {
        autoSize: true,
        layout: {
          background: { type: lwc.ColorType.Solid, color: "white" },
          textColor: "#475569",
        },
        grid: {
          horzLines: { color: "#f1f5f9" },
          vertLines: { color: "#f8fafc" },
        },
        rightPriceScale: { borderColor: "#e2e8f0" },
        timeScale: { borderColor: "#e2e8f0", timeVisible: false },
        crosshair: { mode: lwc.CrosshairMode.Normal },
      });
      const series = chart.addSeries(lwc.AreaSeries, {
        lineColor: "#0f172a",
        topColor: "rgba(15,23,42,0.2)",
        bottomColor: "rgba(15,23,42,0.02)",
        lineWidth: 2,
        priceLineVisible: true,
      });
      chartRef.current = chart;
      seriesRef.current = series;
    })();
    return () => {
      cancelled = true;
      try {
        chartRef.current?.remove();
      } catch {}
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load data when range changes
  useEffect(() => {
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/chart/${market}/${symbol}?range=${range}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "failed");
        setCurrency(j.currency ?? "");
        const data = (j.candles ?? []).map((c: any) => ({
          time: c.time,
          value: c.close,
        }));
        // Wait for series to be available
        const waitForSeries = () =>
          new Promise<void>((resolve) => {
            const check = () => {
              if (seriesRef.current) return resolve();
              setTimeout(check, 50);
            };
            check();
          });
        await waitForSeries();
        seriesRef.current.setData(data);
        chartRef.current?.timeScale().fitContent();
      } catch (e: any) {
        setErr(e?.message ?? "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [market, symbol, range]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Price history</h3>
          <span className="text-xs text-foreground/40">{currency}</span>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`text-xs rounded px-2 py-1 ${
                range === r.id
                  ? "bg-white/[0.04] text-white"
                  : "border border-white/10 hover:bg-white/5"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {err && <div className="text-xs text-rose-600 mb-2">{err}</div>}
      <div ref={ref} className="w-full h-64 md:h-80" />
      {loading && (
        <div className="text-xs text-foreground/40 -mt-6 text-center">Loading…</div>
      )}
    </div>
  );
}
