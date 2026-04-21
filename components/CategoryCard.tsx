import type { ChecklistItem } from "@/lib/scoring";

const CAT_ICON: Record<string, string> = {
  macro: "🌍",
  industry: "🏭",
  company: "🏢",
  valuation: "💰",
  triggers: "🔔",
};

export default function CategoryCard({
  category,
  weight,
  score,
  items,
}: {
  category: string;
  weight: number;
  score: number;
  items: ChecklistItem[];
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CAT_ICON[category]}</span>
          <h3 className="font-semibold capitalize">{category}</h3>
          <span className="text-xs text-foreground/40">· {Math.round(weight * 100)}% weight</span>
        </div>
        <div className="text-lg font-bold">{score.toFixed(1)}</div>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <StatusDot status={it.status} />
                <span>{it.title}</span>
              </div>
              {it.detail && (
                <div className="text-[11px] text-foreground/60 ml-4 mt-0.5 leading-snug">
                  {it.detail}
                </div>
              )}
            </div>
            <div className="text-right text-xs text-foreground/70 font-mono whitespace-nowrap">
              {it.value}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "pass"
      ? "bg-emerald-500"
      : status === "fail"
        ? "bg-rose-500"
        : status === "neutral"
          ? "bg-amber-400"
          : "bg-white/20";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} aria-hidden />;
}
