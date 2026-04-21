"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CompareInput({ defaultA, defaultB }: { defaultA: string; defaultB: string }) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const submit = () => {
    router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="NSE/RELIANCE"
        className="border border-white/15 bg-[hsl(var(--card-fill))] rounded px-2 py-1 w-36 font-mono text-xs"
      />
      <span className="text-foreground/40 font-semibold">vs</span>
      <input
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="NSE/INFY"
        className="border border-white/15 bg-[hsl(var(--card-fill))] rounded px-2 py-1 w-36 font-mono text-xs"
      />
      <button
        onClick={submit}
        className="bg-white/[0.04] text-white rounded px-3 py-1 text-xs"
      >
        Compare
      </button>
      <button
        onClick={() => {
          setA(defaultB);
          setB(defaultA);
          router.push(`/compare?a=${encodeURIComponent(defaultB)}&b=${encodeURIComponent(defaultA)}`);
        }}
        className="border border-white/15 rounded px-2 py-1 text-xs"
        title="Swap sides"
      >
        ⇄
      </button>
    </div>
  );
}
