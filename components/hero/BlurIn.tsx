// Pure CSS blur-in. No framer dependency — animation lives in globals.css.
import type { CSSProperties, ReactNode } from "react";

export default function BlurIn({
  children,
  delay = 0,
  duration = 0.6,
  className = "",
  as: Component = "div",
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const style: CSSProperties = {
    animation: `hero-blur-in ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
  };
  return (
    <Component className={className} style={style}>
      {children}
    </Component>
  );
}
