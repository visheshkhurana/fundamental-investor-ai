"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

function Chat() {
  const params = useSearchParams();
  const market = params.get("m") ?? "";
  const symbol = params.get("s") ?? "";
  const compareMarket = params.get("cm") ?? "";
  const compareSymbol = params.get("cs") ?? "";

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMsgs(nextMsgs);
    const ctrl = new AbortController();
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          message: text,
          market,
          symbol,
          compareMarket,
          compareSymbol,
          history: msgs.slice(-8),
        }),
      });
      if (!r.body) throw new Error("no body");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: any) {
      setMsgs((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `Sorry — couldn't complete that. ${e?.message ?? ""}`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const suggestions = symbol
    ? [
        `Why is ${symbol} scored the way it is?`,
        `What would need to change for ${symbol} to be a Strong Buy?`,
        `Walk me through the Piotroski signals for ${symbol}`,
        `Is the DCF margin of safety on ${symbol} credible?`,
      ]
    : [
        "Explain the scoring framework",
        "How should I use the Piotroski F-Score?",
        "When should I trust a PEG below 1?",
        "What's a moat, and which types are most durable?",
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        {symbol && (
          <span className="text-sm text-foreground/60">
            Context: {symbol} ({market})
            {compareSymbol && ` vs ${compareSymbol} (${compareMarket})`}
          </span>
        )}
      </div>

      <div className="card p-4 min-h-[60vh] flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {msgs.length === 0 && (
            <div className="text-sm text-foreground/60">
              Ask anything. Answers are grounded in the live scoring framework for the stock above.
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-white/10"
                  : "bg-white/[0.04] text-white ml-auto"
              }`}
            >
              {m.content || (m.role === "assistant" && busy ? "…" : "")}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about this stock, compare two, or explain the framework…"
            className="flex-1 border border-white/15 rounded-lg px-3 py-2 text-sm"
            disabled={busy}
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="bg-white/[0.04] text-white text-sm rounded-lg px-4 disabled:opacity-50"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs border border-white/15 rounded-full px-3 py-1 hover:bg-white/5"
              disabled={busy}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-foreground/40">
        Powered by Claude. Every answer is grounded in the live scoring framework. This is research
        tooling, not investment advice.
      </p>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Chat />
    </Suspense>
  );
}
