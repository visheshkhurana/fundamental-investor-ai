"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tradingFetch } from "@/lib/clientId";
import { ASSET_CLASSES, ASSET_CLASS_LABEL, SUBTYPES, type AssetClass } from "@/lib/assets";

type Profile = {
  display_name: string | null;
  age: number | null;
  dependents: number;
  risk_tolerance: number | null;
  tax_residence: string | null;
  primary_currency: string;
  monthly_income_inr: number | null;
  monthly_income_usd: number | null;
  monthly_expenses_inr: number | null;
  monthly_expenses_usd: number | null;
  retire_target_age: number | null;
  net_worth_goal_inr: number | null;
};

type Holding = {
  id: string;
  asset_class: AssetClass;
  subtype: string | null;
  label: string;
  market_value_inr: number | null;
  market_value_usd: number | null;
  liquidity_days: number | null;
};

const RISK_LABELS: Record<number, string> = {
  1: "Capital preservation — I'd panic in a drawdown",
  2: "Conservative — some volatility is OK",
  3: "Balanced — the default",
  4: "Growth — I can stomach a 30% drawdown",
  5: "Aggressive — max long-term return, volatility be damned",
};

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pr, hr] = await Promise.all([
          tradingFetch("/api/profile"),
          tradingFetch("/api/assets"),
        ]);
        const pj = await pr.json();
        const hj = await hr.json();
        setProfile(pj.profile);
        setHoldings(hj.holdings ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile(patch: Partial<Profile>) {
    setSaving(true);
    try {
      const r = await tradingFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (j.profile) setProfile(j.profile);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-foreground/60 py-12">Loading your profile…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="text-xs text-foreground/40 uppercase tracking-wide">Foundation</div>
        <h1 className="text-3xl font-bold mt-1">Set up your wealth profile</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-xl">
          This data stays in your browser (no login). It powers allocation targets, idea generation,
          and every downstream recommendation. Fill what you can — you can edit later.
        </p>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-2 text-xs">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold ${
                step >= (n as any) ? "bg-foreground text-background" : "bg-white/10 text-foreground/50"
              }`}
            >
              {n}
            </div>
            <div className={step >= (n as any) ? "text-foreground" : "text-foreground/40"}>
              {n === 1 ? "Profile" : n === 2 ? "Assets" : "Review"}
            </div>
            {n < 3 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {step === 1 && profile && (
        <StepProfile profile={profile} onSave={saveProfile} onNext={() => setStep(2)} saving={saving} />
      )}
      {step === 2 && (
        <StepAssets
          holdings={holdings}
          onChange={setHoldings}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && profile && (
        <StepReview profile={profile} holdings={holdings} onBack={() => setStep(2)} />
      )}
    </div>
  );
}

// ─── Step 1: profile ────────────────────────────────────────────────
function StepProfile({
  profile,
  onSave,
  onNext,
  saving,
}: {
  profile: Profile;
  onSave: (p: Partial<Profile>) => Promise<void>;
  onNext: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(profile);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="card p-6 space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Display name">
          <input
            className="field"
            value={form.display_name ?? ""}
            onChange={(e) => set("display_name", e.target.value || null)}
          />
        </Field>
        <Field label="Age">
          <input
            type="number"
            className="field"
            value={form.age ?? ""}
            onChange={(e) => set("age", e.target.value ? +e.target.value : null)}
          />
        </Field>
        <Field label="Tax residence">
          <select
            className="field"
            value={form.tax_residence ?? ""}
            onChange={(e) => set("tax_residence", e.target.value || null)}
          >
            <option value="">Select…</option>
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Primary currency">
          <select
            className="field"
            value={form.primary_currency}
            onChange={(e) => set("primary_currency", e.target.value)}
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
          </select>
        </Field>
        <Field label="Dependents">
          <input
            type="number"
            className="field"
            value={form.dependents ?? 0}
            onChange={(e) => set("dependents", +e.target.value)}
          />
        </Field>
        <Field label="Retire target age">
          <input
            type="number"
            className="field"
            value={form.retire_target_age ?? ""}
            onChange={(e) => set("retire_target_age", e.target.value ? +e.target.value : null)}
          />
        </Field>
        <Field label="Monthly income (INR)">
          <input
            type="number"
            className="field"
            value={form.monthly_income_inr ?? ""}
            onChange={(e) => set("monthly_income_inr", e.target.value ? +e.target.value : null)}
          />
        </Field>
        <Field label="Monthly expenses (INR)">
          <input
            type="number"
            className="field"
            value={form.monthly_expenses_inr ?? ""}
            onChange={(e) => set("monthly_expenses_inr", e.target.value ? +e.target.value : null)}
          />
        </Field>
      </div>

      <Field label="Risk tolerance">
        <div className="space-y-2">
          <input
            type="range"
            min={1}
            max={5}
            value={form.risk_tolerance ?? 3}
            onChange={(e) => set("risk_tolerance", +e.target.value)}
            className="w-full"
          />
          <div className="text-sm text-foreground/70">
            {RISK_LABELS[form.risk_tolerance ?? 3]}
          </div>
        </div>
      </Field>

      <div className="flex justify-end gap-2">
        <button
          disabled={saving}
          onClick={async () => {
            await onSave(form);
            onNext();
          }}
          className="bg-foreground text-background rounded px-5 h-10 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: assets ─────────────────────────────────────────────────
function StepAssets({
  holdings,
  onChange,
  onNext,
  onBack,
}: {
  holdings: Holding[];
  onChange: (h: Holding[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [adding, setAdding] = useState<AssetClass | null>(null);

  async function addHolding(payload: any) {
    const r = await tradingFetch("/api/assets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (j.holding) onChange([j.holding, ...holdings]);
    setAdding(null);
  }

  async function removeHolding(id: string) {
    await tradingFetch(`/api/assets?id=${id}`, { method: "DELETE" });
    onChange(holdings.filter((h) => h.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="text-sm font-semibold mb-1">Add your assets</div>
        <p className="text-xs text-foreground/60">
          Your stock positions come in automatically from Trade. Add everything else: property,
          FDs, gold, crypto, startup equity.
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {ASSET_CLASSES.filter((c) => c !== "public_equity" && c !== "cash").map((c) => (
            <button
              key={c}
              onClick={() => setAdding(c)}
              className="border border-white/15 rounded px-3 py-2 text-xs text-left hover:bg-white/5"
            >
              + {ASSET_CLASS_LABEL[c]}
            </button>
          ))}
        </div>

        {adding && (
          <AddHoldingForm
            assetClass={adding}
            onCancel={() => setAdding(null)}
            onSave={addHolding}
          />
        )}
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold mb-3">
          Your holdings ({holdings.length})
        </div>
        {holdings.length === 0 ? (
          <div className="text-sm text-foreground/60">
            No assets added yet. You can still continue — your trading book is already included.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {holdings.map((h) => (
              <li key={h.id} className="py-3 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm">{h.label}</div>
                  <div className="text-xs text-foreground/50">
                    {ASSET_CLASS_LABEL[h.asset_class]}
                    {h.subtype ? ` · ${h.subtype}` : ""}
                  </div>
                </div>
                <div className="text-sm tabular-nums text-right">
                  {h.market_value_inr ? `₹${Number(h.market_value_inr).toLocaleString("en-IN")}` : ""}
                  {h.market_value_usd
                    ? ` ${h.market_value_inr ? "· " : ""}$${Number(h.market_value_usd).toLocaleString("en-US")}`
                    : ""}
                </div>
                <button
                  onClick={() => removeHolding(h.id)}
                  className="text-rose-400 text-xs hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <button
          onClick={onBack}
          className="border border-white/15 rounded px-4 h-10 text-sm"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="bg-foreground text-background rounded px-5 h-10 text-sm font-medium"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function AddHoldingForm({
  assetClass,
  onCancel,
  onSave,
}: {
  assetClass: AssetClass;
  onCancel: () => void;
  onSave: (p: any) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [subtype, setSubtype] = useState<string>("");
  const [valueInr, setValueInr] = useState("");
  const [valueUsd, setValueUsd] = useState("");
  const subtypes = SUBTYPES[assetClass] ?? [];

  return (
    <div className="mt-5 border border-white/10 rounded p-4 bg-white/5 space-y-3">
      <div className="text-sm font-medium">Add {ASSET_CLASS_LABEL[assetClass]}</div>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Label">
          <input
            className="field"
            placeholder={
              assetClass === "real_estate" ? "e.g. Bangalore Indiranagar flat" : "e.g. HDFC FD 2027"
            }
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        {subtypes.length > 0 && (
          <Field label="Subtype">
            <select
              className="field"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
            >
              <option value="">—</option>
              {subtypes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Value (₹ INR)">
          <input
            type="number"
            className="field"
            value={valueInr}
            onChange={(e) => setValueInr(e.target.value)}
          />
        </Field>
        <Field label="Value ($ USD)">
          <input
            type="number"
            className="field"
            value={valueUsd}
            onChange={(e) => setValueUsd(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="border border-white/15 rounded px-3 h-9 text-xs"
        >
          Cancel
        </button>
        <button
          disabled={!label}
          onClick={() =>
            onSave({
              asset_class: assetClass,
              subtype: subtype || null,
              label,
              market_value_inr: valueInr ? +valueInr : null,
              market_value_usd: valueUsd ? +valueUsd : null,
            })
          }
          className="bg-foreground text-background rounded px-3 h-9 text-xs font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: review ─────────────────────────────────────────────────
function StepReview({
  profile,
  holdings,
  onBack,
}: {
  profile: Profile;
  holdings: Holding[];
  onBack: () => void;
}) {
  const totalInr = holdings.reduce(
    (s, h) =>
      s + (Number(h.market_value_inr) || 0) + (Number(h.market_value_usd) || 0) / 0.012,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-sm font-semibold mb-3">Summary</div>
        <dl className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row k="Name" v={profile.display_name ?? "—"} />
          <Row k="Age" v={profile.age ?? "—"} />
          <Row k="Tax residence" v={profile.tax_residence ?? "—"} />
          <Row k="Risk tolerance" v={`${profile.risk_tolerance ?? "—"}/5`} />
          <Row
            k="Monthly expenses"
            v={profile.monthly_expenses_inr ? `₹${profile.monthly_expenses_inr.toLocaleString("en-IN")}` : "—"}
          />
          <Row k="Retire at" v={profile.retire_target_age ?? "—"} />
          <Row k="Holdings" v={`${holdings.length} rows`} />
          <Row k="Total (excl. trading)" v={`₹${Math.round(totalInr).toLocaleString("en-IN")}`} />
        </dl>
      </div>

      <div className="card p-6">
        <div className="text-sm font-semibold">You're set.</div>
        <p className="text-sm text-foreground/70 mt-1">
          Next: view your target asset allocation — where your money should live given your age,
          risk tolerance, and goals.
        </p>
        <div className="flex gap-2 mt-4">
          <Link
            href="/allocation"
            className="bg-foreground text-background rounded px-5 h-10 inline-flex items-center text-sm font-medium"
          >
            View allocation →
          </Link>
          <Link
            href="/ideas"
            className="border border-white/15 rounded px-5 h-10 inline-flex items-center text-sm"
          >
            Generate ideas →
          </Link>
        </div>
      </div>

      <button onClick={onBack} className="text-xs text-foreground/50 hover:underline">
        ← Edit assets
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-foreground/50 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <>
      <dt className="text-foreground/50">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </>
  );
}
