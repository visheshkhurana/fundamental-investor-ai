import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchQuote } from "@/lib/yahoo";
import {
  targetAllocation,
  currentAllocation,
  allocationDelta,
  type AllocationMap,
  type ProfileInput,
} from "@/lib/allocation";
import { USD_PER_INR } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

export async function GET(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const sb = supabaseServer();

  const [{ data: profile }, { data: holdings }, { data: acct }] = await Promise.all([
    sb.from("user_profile").select("*").eq("client_id", cid).maybeSingle(),
    sb.from("asset_holdings").select("*").eq("client_id", cid),
    sb.from("trading_accounts").select("id, cash_inr, cash_usd").eq("client_id", cid).maybeSingle(),
  ]);

  // Trading positions (live-valued) — count as public_equity
  let tradingInr = 0;
  let tradingUsd = 0;
  if (acct?.id) {
    const { data: positions } = await sb
      .from("trading_positions")
      .select("market, symbol, qty, avg_cost, currency")
      .eq("account_id", acct.id);
    if (positions) {
      // Value at live price where possible; fall back to cost
      for (const p of positions) {
        const q = await fetchQuote(p.market, p.symbol).catch(() => null);
        const ltp = q?.price ?? Number(p.avg_cost);
        const v = ltp * Number(p.qty);
        if (p.currency === "USD") tradingUsd += v;
        else tradingInr += v;
      }
    }
  }

  const cashInr = acct ? Number(acct.cash_inr) : 0;
  const cashUsd = acct ? Number(acct.cash_usd) : 0;

  const { allocation: current, totalInr } = currentAllocation(
    (holdings ?? []) as any,
    tradingInr,
    tradingUsd,
    cashInr,
    cashUsd,
  );

  const profileInput: ProfileInput = {
    age: profile?.age ?? null,
    riskTolerance: profile?.risk_tolerance ?? null,
    taxResidence: profile?.tax_residence ?? null,
    monthlyExpensesInr: profile?.monthly_expenses_inr ?? null,
    monthlyExpensesUsd: profile?.monthly_expenses_usd ?? null,
    retireTargetAge: profile?.retire_target_age ?? null,
  };
  const { allocation: target, rationale } = targetAllocation(profileInput);
  const delta = allocationDelta(current, target);

  // Cash liquidity floor for surfaced warning
  const monthlyExpInr =
    (profile?.monthly_expenses_inr ?? 0) +
    (profile?.monthly_expenses_usd ?? 0) / USD_PER_INR;
  const cashFloorInr = monthlyExpInr * 6;
  const cashInrTotal = cashInr + cashUsd / USD_PER_INR;
  const cashShortfallInr = cashFloorInr - cashInrTotal;

  // Persist snapshot (best effort)
  sb.from("allocation_recommendations")
    .insert({
      client_id: cid,
      current_allocation: current as unknown as Record<string, number>,
      target_allocation: target as unknown as Record<string, number>,
      delta_pp: delta as unknown as Record<string, number>,
      rationale_md: rationale.join("\n\n"),
      total_nav_inr: totalInr,
      total_nav_usd: totalInr * USD_PER_INR,
    })
    .then(() => {});

  // Rebalance plan: biggest deltas first
  const plan = (Object.keys(delta) as (keyof AllocationMap)[])
    .map((k) => ({
      asset_class: k,
      delta_pp: delta[k] * 100,
      inr_amount: delta[k] * totalInr,
    }))
    .filter((r) => Math.abs(r.delta_pp) >= 2)
    .sort((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp));

  return NextResponse.json({
    current,
    target,
    delta,
    rationale,
    total_nav_inr: totalInr,
    cash_floor_inr: cashFloorInr,
    cash_shortfall_inr: cashShortfallInr,
    plan,
    has_profile: !!profile && (profile.age != null || profile.risk_tolerance != null),
  });
}
