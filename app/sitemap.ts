import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase";

const base = "https://fundamental-investor-ai.vercel.app";

const STATIC_ROUTES = [
  "",
  "/curator",
  "/ideas",
  "/allocation",
  "/onboarding",
  "/screen",
  "/compare",
  "/lens",
  "/trade",
  "/estate",
  "/assistant",
  "/about",
  "/learn",
  "/learn/piotroski-f-score",
  "/learn/altman-z-score",
  "/learn/moats",
  "/learn/dcf",
  "/learn/peg",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = supabaseServer();
  const { data: stocks } = await sb
    .from("stocks")
    .select("market, symbol")
    .eq("is_active", true)
    .limit(300);

  const now = new Date();

  const stat = STATIC_ROUTES.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p.startsWith("/learn") ? ("monthly" as const) : ("weekly" as const),
    priority: p === "" ? 1 : 0.7,
  }));

  const dyn = (stocks ?? []).map((s: any) => ({
    url: `${base}/s/${s.market}/${s.symbol}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...stat, ...dyn];
}
