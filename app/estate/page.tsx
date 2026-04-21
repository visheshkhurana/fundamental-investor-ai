"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Region = "IN" | "US";

type CheckItem = {
  id: string;
  label: string;
  hint: string;
  severity: "critical" | "important" | "nice";
};

const CHECKLIST: Record<Region, { group: string; items: CheckItem[] }[]> = {
  IN: [
    {
      group: "Foundation",
      items: [
        { id: "will", label: "You have a Will", hint: "Updated in the last 5 years. Indian Registration Act registration recommended but not required.", severity: "critical" },
        { id: "will_updated", label: "Will is current", hint: "Reviewed after every major life event — marriage, birth, property purchase, inheritance.", severity: "critical" },
        { id: "executor", label: "Named executor", hint: "Someone you trust and who is likely to outlive you.", severity: "critical" },
        { id: "emergency_contact", label: "Emergency contact on file", hint: "Someone who knows where your Will + this checklist lives.", severity: "important" },
      ],
    },
    {
      group: "Financial accounts",
      items: [
        { id: "bank_nom", label: "Nominations on every bank account", hint: "Savings, FD, RD. Joint holding adds an extra layer.", severity: "critical" },
        { id: "demat_nom", label: "Nominations on every demat account", hint: "Required by SEBI as of 2024. No nominee = frozen account.", severity: "critical" },
        { id: "mf_nom", label: "Nominations on every mutual-fund folio", hint: "Separate from demat. Check each AMC.", severity: "critical" },
        { id: "epf_nom", label: "EPF nominee set", hint: "Through UAN portal. Update after marriage.", severity: "important" },
        { id: "ppf_nom", label: "PPF nominee set", hint: "Even if account is with a bank — nominee is separate.", severity: "important" },
        { id: "insurance_nom", label: "Life-insurance nominee current", hint: "Spouse + kids typical. MWP Act designation gives creditor protection.", severity: "critical" },
      ],
    },
    {
      group: "Documentation",
      items: [
        { id: "docs_location", label: "Originals stored in a known place", hint: "Locker + digital copy. Executor knows where both are.", severity: "important" },
        { id: "digital_access", label: "Digital access plan", hint: "Email + authenticator recovery codes + password manager master. 2FA seed phrases.", severity: "important" },
        { id: "pan_aadhaar", label: "PAN + Aadhaar copies accessible", hint: "Required for any claim process.", severity: "nice" },
      ],
    },
    {
      group: "Advanced (if applicable)",
      items: [
        { id: "property", label: "Real estate paperwork clean", hint: "Registered Will or registered Gift. Joint ownership with right of survivorship.", severity: "important" },
        { id: "private_cos", label: "Private-company shares transfer plan", hint: "Articles of Association, shareholders' agreement. Requires board approval on death.", severity: "nice" },
        { id: "trust", label: "Trust for high-value assets", hint: "Worth considering above ₹5Cr NW or complex family situations.", severity: "nice" },
      ],
    },
  ],
  US: [
    {
      group: "Foundation",
      items: [
        { id: "will", label: "You have a Will", hint: "State-compliant (witnesses, notarization where required).", severity: "critical" },
        { id: "will_updated", label: "Will is current", hint: "Reviewed after every major life event — marriage, birth, interstate move.", severity: "critical" },
        { id: "executor", label: "Named executor", hint: "US-resident, likely to outlive you.", severity: "critical" },
        { id: "living_will", label: "Healthcare directive / living will", hint: "Power of attorney for healthcare + financial.", severity: "important" },
      ],
    },
    {
      group: "Financial accounts",
      items: [
        { id: "brokerage_tod", label: "TOD (Transfer on Death) on brokerage accounts", hint: "Bypasses probate. Set per account.", severity: "critical" },
        { id: "401k_benef", label: "401k / IRA / Roth beneficiaries current", hint: "Beneficiary designation supersedes Will. Update after marriage / divorce.", severity: "critical" },
        { id: "bank_pod", label: "POD (Payable on Death) on bank accounts", hint: "Check joint ownership with spouse too.", severity: "critical" },
        { id: "life_insurance", label: "Life insurance beneficiaries current", hint: "Primary + contingent. Minor children need a trust, not direct designation.", severity: "critical" },
        { id: "hsa_benef", label: "HSA beneficiary", hint: "Spouse inherits tax-free; anyone else pays income tax on full balance.", severity: "important" },
      ],
    },
    {
      group: "Documentation",
      items: [
        { id: "docs_location", label: "Originals stored in a known place", hint: "Fireproof safe + executor knows the location. Digital copies in cloud vault.", severity: "important" },
        { id: "digital_access", label: "Digital access plan", hint: "Password manager + 2FA recovery codes. Apple Legacy Contact, Google Inactive Account Manager.", severity: "important" },
      ],
    },
    {
      group: "Advanced (if applicable)",
      items: [
        { id: "trust", label: "Revocable living trust", hint: "Worth considering above $5M NW, or owning property in multiple states.", severity: "nice" },
        { id: "real_estate", label: "Real-estate titling clean", hint: "Joint with right of survivorship, or TOD deed where state allows.", severity: "important" },
        { id: "estate_tax", label: "Estate-tax plan (above $13.6M exemption)", hint: "Irrevocable trusts, gift-tax annual exclusion, generation-skipping.", severity: "nice" },
      ],
    },
  ],
};

const LS_KEY = "fi.estate.v1";

type Saved = {
  region: Region;
  checked: Record<string, boolean>;
  updatedAt: string;
};

const blank = (region: Region): Saved => ({ region, checked: {}, updatedAt: "" });

export default function EstatePage() {
  const [state, setState] = useState<Saved>(() => blank("IN"));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  const save = (next: Saved) => {
    next.updatedAt = new Date().toISOString();
    setState(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
  };

  const toggle = (id: string) => {
    save({ ...state, checked: { ...state.checked, [id]: !state.checked[id] } });
  };

  const setRegion = (region: Region) => {
    save({ ...state, region });
  };

  const groups = CHECKLIST[state.region];
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const done = flat.filter((i) => state.checked[i.id]).length;
  const critical = flat.filter((i) => i.severity === "critical");
  const criticalDone = critical.filter((i) => state.checked[i.id]).length;
  const score = flat.length > 0 ? done / flat.length : 0;

  const status =
    criticalDone === critical.length && done >= flat.length * 0.8
      ? { label: "Ready", tone: "chip-strong" }
      : criticalDone >= critical.length * 0.7
        ? { label: "Mostly there", tone: "chip-buy" }
        : criticalDone >= critical.length * 0.4
          ? { label: "In progress", tone: "chip-hold" }
          : { label: "Critical gaps", tone: "chip-avoid" };

  const exportHandoff = () => {
    const region = state.region;
    const today = new Date().toLocaleDateString();
    const blocks = groups.map((g) => {
      const items = g.items
        .map((i) => `  [${state.checked[i.id] ? "✓" : " "}] ${i.label} — ${i.hint}`)
        .join("\n");
      return `### ${g.group}\n${items}`;
    });
    const md = `# Heir Handoff — ${region}\n\nGenerated ${today}\n\nCompletion: ${done} / ${flat.length} items · Critical items: ${criticalDone} / ${critical.length}\n\n${blocks.join("\n\n")}\n\n---\nThis is a checklist, not a legal document. Reviewed by a ${region === "IN" ? "lawyer familiar with Indian succession law" : "US estate attorney"} before relying on it.`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heir-handoff-${region}-${today.replace(/\//g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!loaded) {
    return <div className="py-16 text-center text-foreground/60">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Estate checklist</h1>
        <p className="text-sm text-foreground/60 mt-1">
          If something happens to you tomorrow, your family shouldn't have to fight paperwork to
          access what's theirs. This is a checklist, not legal advice — use it to find gaps, then
          fill them with your lawyer.
        </p>
      </header>

      {/* Region toggle */}
      <div className="flex items-center gap-2">
        {(["IN", "US"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              state.region === r
                ? "bg-white/[0.08] text-white border-white/30"
                : "border-white/15 text-foreground/60 hover:bg-white/5"
            }`}
          >
            {r === "IN" ? "🇮🇳 India" : "🇺🇸 United States"}
          </button>
        ))}
      </div>

      {/* Status + progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/40">Status</div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`chip ${status.tone}`}>{status.label}</span>
              <span className="text-sm text-foreground/60 tabular-nums">
                {done} / {flat.length} done · {criticalDone} / {critical.length} critical
              </span>
            </div>
          </div>
          <button
            onClick={exportHandoff}
            className="bg-white/[0.08] text-white border border-white/15 rounded-lg px-4 py-2 text-sm"
          >
            Export heir handoff ↓
          </button>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${score * 100}%` }}
          />
        </div>
      </div>

      {/* Groups */}
      {groups.map((g) => {
        const groupDone = g.items.filter((i) => state.checked[i.id]).length;
        return (
          <section key={g.group}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm uppercase tracking-wider text-foreground/40">{g.group}</h2>
              <span className="text-xs text-foreground/40 tabular-nums">
                {groupDone} / {g.items.length}
              </span>
            </div>
            <div className="card overflow-hidden">
              {g.items.map((it, i) => {
                const on = !!state.checked[it.id];
                return (
                  <button
                    key={it.id}
                    onClick={() => toggle(it.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition ${
                      i < g.items.length - 1 ? "border-b border-white/5" : ""
                    } hover:bg-white/[0.03]`}
                  >
                    <span
                      className={`w-4 h-4 mt-0.5 shrink-0 rounded border ${
                        on
                          ? "bg-emerald-400 border-emerald-400 grid place-items-center"
                          : "border-white/30"
                      }`}
                    >
                      {on && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3 h-3 text-[#010205]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M2 6 L5 9 L10 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${on ? "line-through text-foreground/50" : ""}`}>
                          {it.label}
                        </span>
                        {it.severity === "critical" && (
                          <span className="text-[10px] uppercase tracking-wider text-rose-300">
                            critical
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground/60 mt-0.5 leading-snug">
                        {it.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-foreground/40">
        Saved locally in your browser. No server record. For the real version — registered Will,
        witnessed signatures, beneficiary paperwork — see a lawyer in your jurisdiction.{" "}
        <Link href="/learn" className="underline">
          Learn more
        </Link>{" "}
        about the other frameworks used on this site.
      </p>
    </div>
  );
}
