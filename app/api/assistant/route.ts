import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Fundamental Investor AI, a research assistant for long-term investors.

Ground every claim in the scoring framework you're given. The framework weights:
- Macro (10%): rates, inflation, currency, GDP
- Industry (20%): structure, growth, moat potential
- Company (40%): revenue growth, operating margin, ROE, D/E, FCF, Piotroski F-Score, Altman Z-Score, Dorsey moat
- Valuation (20%): P/E, PEG (Lynch), EV/EBITDA, DCF margin of safety
- Triggers (10%): analyst consensus, earnings momentum

Verdicts: 8-10 Strong Buy · 6-8 Buy · 4-6 Hold · <4 Avoid.

Rules:
- Always explain the score in terms of which checklist items passed or failed, and reference specific numbers (e.g., "ROE 18.2%", "PEG 0.82").
- If a number is missing, say so explicitly — don't invent.
- Never recommend position sizes. Never predict prices. Never say "this will go up."
- Frame everything as research tooling, not investment advice.
- Be concise. Use bullet points only when comparing things or listing checklist items. Otherwise, prose.
- If asked about something outside the framework (e.g., options, day-trading), politely redirect to the long-only, fundamentals-driven lens.
- End every answer with a one-line reminder: "Research tooling, not investment advice."`;

type Body = {
  message: string;
  market?: string;
  symbol?: string;
  compareMarket?: string;
  compareSymbol?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

async function buildContext(market?: string, symbol?: string) {
  if (!market || !symbol) return null;
  const [q, f] = await Promise.all([
    fetchQuote(market, symbol),
    fetchFundamentals(market, symbol),
  ]);
  if (!f) return null;
  const s = scoreStock(f, q?.price ?? null);
  return {
    header: `${symbol} (${market})`,
    quote: q,
    fundamentals: f,
    score: s,
  };
}

function formatCtx(c: Awaited<ReturnType<typeof buildContext>>): string {
  if (!c) return "";
  const { header, quote, fundamentals: f, score: s } = c;
  const item = (id: string) =>
    s.items.find((i) => i.id === id) ?? { value: "—", status: "missing" };
  return `
### ${header}
Sector: ${f.sector ?? "?"} · Industry: ${f.industry ?? "?"}
Price: ${quote?.price ?? "?"} ${quote?.currency ?? ""} (52w ${quote?.yearLow ?? "?"}–${quote?.yearHigh ?? "?"})
Market cap: ${f.marketCap ?? "?"} · Currency: ${f.currency ?? "?"}

Composite score: **${s.total.toFixed(2)}** → ${s.verdict.toUpperCase().replace("_"," ")}
By category: macro ${s.byCategory.macro} · industry ${s.byCategory.industry} · company ${s.byCategory.company} · valuation ${s.byCategory.valuation} · triggers ${s.byCategory.triggers}

Key metrics:
- Revenue growth YoY: ${item("rev_growth").value}
- Operating margin: ${item("op_margin").value}
- ROE: ${item("roe").value}
- D/E: ${item("de_low").value}
- Free cash flow: ${item("fcf_positive").value}
- Piotroski F-Score: ${item("piotroski").value}
- Altman Z-Score: ${item("altman").value}
- Moat: ${item("moat").value} (${s.advanced.moat.rationale})
- P/E: ${item("pe").value}
- PEG (Lynch): ${item("peg").value}
- EV/EBITDA: ${item("ev_ebitda").value}
- DCF margin of safety: ${item("dcf_margin").value}
- Analyst consensus: ${item("analyst_bullish").value}
- Earnings growth YoY: ${item("earnings_growth").value}
`.trim();
}

export async function POST(req: NextRequest) {
  const { message, market, symbol, compareMarket, compareSymbol, history = [] }: Body =
    await req.json();
  if (!message) return new Response("message required", { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response("ANTHROPIC_API_KEY missing", { status: 500 });
  const anthropic = new Anthropic({ apiKey });

  const ctxA = await buildContext(market, symbol);
  const ctxB = await buildContext(compareMarket, compareSymbol);
  const ctxBlock =
    [formatCtx(ctxA), formatCtx(ctxB)].filter(Boolean).join("\n\n---\n\n") ||
    "(No specific stock context provided. Answer from general fundamentals frameworks, and if the user asks about a specific stock, tell them to open that stock's dashboard first so you have live data.)";

  const systemWithCtx = `${SYSTEM_PROMPT}\n\n## Current context\n${ctxBlock}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const resp = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemWithCtx,
          messages: [
            ...history.map((h) => ({ role: h.role, content: h.content })),
            { role: "user" as const, content: message },
          ],
        });
        for await (const event of resp) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`\n\n[assistant error: ${e?.message ?? "unknown"}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
