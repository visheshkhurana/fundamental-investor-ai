// Word-by-word staggered blur+rise, pure CSS.
import type { CSSProperties } from "react";

export default function SplitText({
  text,
  className,
  wordClassName,
  delayStart = 0,
  stagger = 0.08,
  duration = 0.6,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delayStart?: number;
  stagger?: number;
  duration?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => {
        const style: CSSProperties = {
          display: "inline-block",
          whiteSpace: "pre",
          animation: `hero-word-in ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${
            delayStart + i * stagger
          }s both`,
        };
        return (
          <span key={`${w}-${i}`} className={wordClassName} style={style}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
}
