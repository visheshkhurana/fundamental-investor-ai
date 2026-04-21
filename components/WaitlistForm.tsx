"use client";
import { useState } from "react";

export default function WaitlistForm({ source = "homepage" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    setState("loading");
    setMsg(null);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const j = await r.json();
      if (!r.ok) {
        setState("err");
        setMsg(j.error ?? "Couldn't save — try again.");
      } else {
        setState("ok");
        setMsg("You're on the list. We'll email when the digest ships.");
        setEmail("");
      }
    } catch (e: any) {
      setState("err");
      setMsg("Network error.");
    }
  };

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 border border-white/15 rounded-lg px-3 py-2 text-sm bg-[hsl(var(--card-fill))]"
          disabled={state === "loading"}
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "ok"}
          className="bg-white/[0.04] text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {state === "loading" ? "…" : state === "ok" ? "Added ✓" : "Get the digest"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${
            state === "ok" ? "text-emerald-600" : state === "err" ? "text-rose-600" : "text-foreground/60"
          }`}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
