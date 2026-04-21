// Ambient hero backdrop — 4 layers, all pure CSS or static SVG.
//   1. Base colour #070612
//   2. Two large radial "blobs" drifting via CSS keyframes
//   3. A subtle sparkline SVG motif at low opacity with grid pattern
//   4. Bottom fade to transparent for seamless transition into the page below

export default function AnimatedHeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base colour */}
      <div className="absolute inset-0 bg-[#070612]" />

      {/* Drifting indigo blob */}
      <div
        className="absolute w-[60vw] h-[60vw] rounded-full hero-blob-a"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.40), rgba(99,102,241,0) 70%)",
          filter: "blur(40px)",
          top: "-10%",
          left: "-5%",
        }}
      />
      {/* Drifting emerald blob */}
      <div
        className="absolute w-[55vw] h-[55vw] rounded-full hero-blob-b"
        style={{
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.30), rgba(16,185,129,0) 70%)",
          filter: "blur(60px)",
          bottom: "-25%",
          right: "-10%",
        }}
      />
      {/* Violet accent blob */}
      <div
        className="absolute w-[40vw] h-[40vw] rounded-full hero-blob-c"
        style={{
          background:
            "radial-gradient(closest-side, rgba(168,85,247,0.25), rgba(168,85,247,0) 70%)",
          filter: "blur(50px)",
          top: "35%",
          right: "20%",
        }}
      />

      {/* Sparkline motif + subtle grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.12]"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={sparklinePath(i)}
            stroke="url(#sparkStroke)"
            strokeWidth={1.5}
            fill="none"
            className="hero-sparkline"
            style={{ animationDelay: `${0.2 + i * 0.3}s` }}
            pathLength={1}
          />
        ))}
      </svg>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(7,6,18,0.55) 100%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute left-0 right-0 bottom-0 h-40 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(7,6,18,0) 0%, #070612 100%)",
        }}
      />
    </div>
  );
}

// Deterministic chart-like paths (no Math.random → stable SSR output).
function sparklinePath(seed: number): string {
  const yBase = 200 + seed * 220;
  const points: [number, number][] = [];
  const width = 1440;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const drift = Math.sin(i * 0.4 + seed * 1.3) * 30;
    const trend = (i / steps) * -60;
    const y = yBase + drift + trend + Math.sin(i * 1.1 + seed) * 10;
    points.push([x, y]);
  }
  return points
    .map(([x, y], i) =>
      i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");
}
