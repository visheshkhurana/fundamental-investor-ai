import { createClient } from "@supabase/supabase-js";

// Supabase "anon/publishable" key is public by design and safe to embed.
// Override via env var if you fork this.
const DEFAULT_URL = "https://djgxjcylmlirugnjlyry.supabase.co";
const DEFAULT_KEY = "sb_publishable_0Y-hU59jbMIVVxDihI4BYg_0dwCkzkM";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
  return createClient(url, key, {
    auth: { persistSession: false },
    // Next.js 14 caches `fetch` calls by default. That's the wrong default for a
    // database client — stale reads cause very confusing bugs. Force no-store so
    // every Supabase query hits Postgres fresh.
    global: {
      fetch: (...args: Parameters<typeof fetch>) => {
        const [input, init] = args;
        return fetch(input, { ...(init ?? {}), cache: "no-store" });
      },
    },
  });
}
