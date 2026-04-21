import { verdictChip, verdictLabel } from "@/lib/fmt";

export default function ScoreBadge({
  total,
  verdict,
  size = "md",
}: {
  total: number;
  verdict: string;
  size?: "sm" | "md" | "lg";
}) {
  const ring = size === "lg" ? "w-24 h-24" : size === "md" ? "w-16 h-16" : "w-12 h-12";
  const numText = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";
  const pct = Math.max(0, Math.min(100, (total / 10) * 100));
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className={`score-ring rounded-full grid place-items-center ${ring}`}
        style={{ ["--p" as any]: pct }}
      >
        <div className="bg-[hsl(var(--card-fill))] rounded-full grid place-items-center" style={{ width: "78%", height: "78%" }}>
          <span className={`font-bold ${numText}`}>{total.toFixed(1)}</span>
        </div>
      </div>
      <span className={verdictChip(verdict)}>{verdictLabel(verdict)}</span>
    </div>
  );
}
