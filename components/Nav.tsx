"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/curator", label: "Curator" },
  { href: "/ideas", label: "Ideas" },
  { href: "/allocation", label: "Allocation" },
  { href: "/screen", label: "Screen" },
  { href: "/lens", label: "Lens" },
  { href: "/trade", label: "Trade" },
  { href: "/estate", label: "Estate" },
  { href: "/assistant", label: "Chat" },
];

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shell = scrolled
    ? "bg-background/60 backdrop-blur-xl border-white/10"
    : "bg-transparent border-transparent";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${shell}`}
    >
      <div className="mx-auto max-w-[1440px] flex items-center justify-between px-6 py-4 lg:px-12">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg">📈</span>
          <span className="font-semibold text-foreground tracking-tight">
            Fundamental Investor
            <span className="text-foreground/50"> AI</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Main">
          {TABS.map((t, i) => {
            const active = pathname.startsWith(t.href);
            return (
              <div key={t.href} className="flex items-center gap-7">
                <Link
                  href={t.href}
                  className={`text-sm transition-colors ${
                    active ? "text-foreground" : "nav-link"
                  }`}
                >
                  {t.label}
                </Link>
                {i < TABS.length - 1 && (
                  <span className="w-px h-4 bg-white/10" aria-hidden />
                )}
              </div>
            );
          })}
        </nav>

        <Link
          href="/curator"
          className="hidden lg:inline-flex items-center rounded-md bg-foreground px-5 h-10 text-sm font-medium text-background hover:bg-foreground/90 transition"
        >
          Try now
        </Link>

        {/* Mobile: compact menu */}
        <div className="lg:hidden flex items-center gap-3 text-sm">
          <Link href="/curator" className="nav-link">
            Curator
          </Link>
          <Link href="/screen" className="nav-link">
            Screen
          </Link>
          <Link
            href="/trade"
            className="rounded bg-foreground text-background px-3 h-8 inline-flex items-center text-xs font-medium"
          >
            Trade
          </Link>
        </div>
      </div>
    </header>
  );
}
