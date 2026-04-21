"use client";
import { useState, useMemo } from "react";
import { tradingFetch } from "@/lib/clientId";
import SuggestedMoves, { parseReview } from "./SuggestedMoves";

export default function PortfolioReviewButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // Parse prose body + actions out of the streamed text. Recompute on every
  // update so actions appear as soon as the JSON block closes.
  const { body, actions } = useMemo(() => parseReview(text), [text]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setText("");
    try {
      const r = await tradingFetch("/api/trading/portfolio-review", { method: "POST" });
      if (!r.body) throw new Error("no body");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    } catch (e: any) {
      setText(`Error: ${e?.message ?? "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          if (!text) run();
        }}
        className="bg-white/[0.04] text-white rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
      >
        🤖 Review my portfolio
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[hsl(var(--card-fill))] rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">Claude · portfolio review</div>
                <div className="text-xs text-foreground/60">
                  Reads your positions + scored fundamentals. Streaming response.
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-foreground/40 hover:text-foreground/80"
              >
                ✕
              </button>
            </div>
            {busy && !text && (
              <div className="text-sm text-foreground/60">Reading your positions…</div>
            )}
            <article
              className="prose prose-sm prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMd(body) }}
            />
            {!busy && <SuggestedMoves actions={actions} />}
            {!busy && text && (
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                <button
                  onClick={run}
                  className="text-xs border border-white/15 rounded px-3 py-1.5"
                >
                  ↻ Re-run
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(text);
                  }}
                  className="text-xs border border-white/15 rounded px-3 py-1.5"
                >
                  Copy text
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Minimal markdown renderer — just enough for ### headings, **bold**, *italic*, and paragraphs.
function renderMd(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escape(src)
    .replace(/^### (.*)$/gm, '<h3 class="font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="font-semibold mt-5 mb-1">$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/^\- (.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .concat("</p>");
}
