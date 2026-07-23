import { useState } from "react";
import {
  CURATOR_SHARE_LABEL,
  MINT_REDEEM_FEE_LABEL,
  STREAMING_FEE_LABEL,
} from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

/**
 * Product preview of the rebalance workflow.
 *
 * The component prices and the NAV are live oracle data. The business figures
 * below them cannot be: no basket is deployed, so there is no TVL, there are no
 * holders and no fees have been earned. They are shown as an example and are
 * labelled as one — never dressed up as a live position.
 */
const BASE = [
  { sym: "NVDA", name: "NVIDIA Corp.", w: 22 },
  { sym: "MSFT", name: "Microsoft Corp.", w: 16 },
  { sym: "AAPL", name: "Apple Inc.", w: 14 },
  { sym: "AMZN", name: "Amazon.com", w: 12 },
  { sym: "META", name: "Meta Platforms", w: 10 },
  { sym: "TSM", name: "Taiwan Semiconductor", w: 10 },
  { sym: "AMD", name: "Advanced Micro Devices", w: 8 },
  { sym: "PLTR", name: "Palantir Technologies", w: 8 },
];
const PALETTE = [
  "oklch(0.62 0.17 155)",
  "oklch(0.30 0.02 168)",
  "oklch(0.74 0.13 155)",
  "oklch(0.50 0.02 168)",
  "oklch(0.46 0.13 155)",
  "oklch(0.66 0.02 168)",
  "oklch(0.84 0.09 155)",
  "oklch(0.38 0.07 155)",
];

const stepBtn =
  "size-[26px] cursor-pointer border-2 border-ink bg-ground p-0 font-extrabold leading-none hover:bg-surface";

export default function ManagePanel() {
  const { hist, mode } = useTokenMarket();
  const [draft, setDraft] = useState<Record<string, number> | null>(null);
  const [mintOpen, setMintOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState(false);

  const weights = draft ?? Object.fromEntries(BASE.map((b) => [b.sym, b.w]));
  const bump = (sym: string, d: number) => {
    const w = { ...weights };
    w[sym] = Math.min(60, Math.max(2, w[sym] + d));
    setDraft(w);
  };

  // The NAV line is the draft weights valued at live oracle prices, aligned on
  // the shortest series so every point sums the same set of components. It used
  // to be a random walk; a curator sizing a real basket needs the real number.
  const series = BASE.map((b) => hist[b.sym]).filter(
    (x): x is number[] => !!x && x.length > 0,
  );
  const complete = series.length === BASE.length;
  const n = complete ? Math.min(...series.map((x) => x.length)) : 0;
  const a: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = 0;
    BASE.forEach((b, j) => {
      const x = series[j];
      v += x[x.length - n + i] * (weights[b.sym] / 100);
    });
    a.push(v);
  }
  const navV = a.length ? a[a.length - 1] : null;
  const chgV = a.length > 1 ? (navV! / a[0] - 1) * 100 : null;
  const total = BASE.reduce((s, b) => s + weights[b.sym], 0);
  const okTotal = Math.round(total) === 100;
  const changes = BASE.filter((b) => weights[b.sym] !== b.w).map((b) => {
    const d = weights[b.sym] - b.w;
    return {
      sym: b.sym,
      from: `${b.w}%`,
      to: `${weights[b.sym]}%`,
      diff: `${d > 0 ? "+" : ""}${d}%`,
      up: d > 0,
    };
  });
  const dirty = changes.length > 0;

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-6 pt-[calc(2*28px)] pb-[calc(1.5*28px)]">
        <div>
          <span className="mb-3 block text-[13px] uppercase tracking-[0.08em] text-accent-700 tnum">
            Draft basket · not deployed
          </span>
          <h1 className="m-0 -ml-[0.058em] text-[clamp(32px,4vw,52px)] leading-[1.08] tracking-[-0.02em]">
            Tech Momentum
          </h1>
        </div>
        {navV === null ? (
          <AwaitingMarket mode={mode} subject="NAV" />
        ) : (
          <div className="flex items-baseline gap-3">
            <span className="font-heading font-extrabold text-[clamp(28px,3vw,40px)] tnum">
              ${navV.toFixed(2)}
            </span>
            <span
              className={`text-[15px] tnum ${chgV === null ? "text-ink/55" : chgV >= 0 ? "text-gain" : "text-loss"}`}
            >
              {chgV === null
                ? "—"
                : `${chgV >= 0 ? "+" : ""}${chgV.toFixed(2)}%`}
            </span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border-y-2 border-divider">
        {[
          { l: "TVL", v: "$0" },
          { l: "Holders", v: "0" },
          {
            l: "Fee · your split",
            v: `${MINT_REDEEM_FEE_LABEL} in/out · ${CURATOR_SHARE_LABEL}`,
          },
          { l: "Your fees / yr", v: "$0", accent: true },
        ].map((s, i) => (
          <div
            key={s.l}
            className={`py-5 ${i === 0 ? "pr-6" : "px-6"} ${i < 3 ? "border-r border-divider" : ""}`}
          >
            <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-ink/55">
              {s.l}
            </p>
            <p
              className={`mt-1.5 mb-0 font-heading font-extrabold text-[26px] tnum ${s.accent ? "text-accent-700" : ""}`}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-x-[clamp(28px,4vw,56px)] pb-[calc(2*28px)] lg:grid-cols-[minmax(0,7fr)_minmax(300px,5fr)]">
        <div className="pt-[calc(1.5*28px)]">
          <div className="mb-4.5 flex items-baseline justify-between gap-4">
            <h2 className="m-0 text-xl tracking-[-0.01em]">
              Recipe: edit weights to draft a rebalance
            </h2>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent-700 underline hover:text-accent-600"
            >
              Reset draft
            </button>
          </div>
          <div className="border-t-2 border-divider">
            {BASE.map((b, i) => {
              const nw = weights[b.sym];
              const d = nw - b.w;
              return (
                <div
                  key={b.sym}
                  className="flex items-center gap-3 border-b border-divider py-2.5"
                >
                  <span
                    className="size-2.5 flex-none"
                    style={{ background: PALETTE[i] }}
                  />
                  <span className="w-[60px] flex-none font-heading font-extrabold text-sm">
                    {b.sym}
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-ink/65 max-sm:hidden">
                    {b.name}
                  </span>
                  <span className="w-[44px] flex-none text-right text-[13px] text-ink/50 tnum">
                    {b.w}%
                  </span>
                  <span
                    className="flex-none text-[13px] text-ink/40"
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <span
                    className={`w-[44px] flex-none text-right text-[13.5px] tnum ${d !== 0 ? "font-heading font-extrabold" : ""}`}
                  >
                    {nw}%
                  </span>
                  <span
                    className={`w-[46px] flex-none text-[11.5px] tnum ${d > 0 ? "text-gain" : "text-loss"}`}
                  >
                    {d === 0 ? "" : `${d > 0 ? "+" : ""}${d}%`}
                  </span>
                  <div className="flex flex-none">
                    <button
                      type="button"
                      aria-label={`Decrease ${b.sym}`}
                      onClick={() => bump(b.sym, -2)}
                      className={stepBtn}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label={`Increase ${b.sym}`}
                      onClick={() => bump(b.sym, 2)}
                      className={`${stepBtn} border-l-0`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3.5 flex h-3 gap-0.5">
            {BASE.map((b, i) => (
              <div
                key={b.sym}
                title={b.sym}
                style={{
                  width: `${Math.max(weights[b.sym], 1)}%`,
                  background: PALETTE[i],
                }}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <span
              className={`text-[13px] tnum ${okTotal ? "text-accent-700" : "text-loss"}`}
            >
              Draft total: {Math.round(total)}%
            </span>
            <button
              type="button"
              disabled={!dirty || !okTotal}
              onClick={() => {
                setConfirming(true);
                setPublished(false);
              }}
              className="cursor-pointer border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm hover:bg-accent-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
            >
              {!dirty
                ? "No changes drafted"
                : !okTotal
                  ? "Total must be 100%"
                  : `Publish rebalance (${changes.length})`}
            </button>
          </div>
          <p className="mt-3 mb-0 max-w-[66ch] text-[12px] leading-[18px] text-ink/55">
            Publishing a rebalance is one signature. Holders are notified, the
            change is timestamped onchain, and the protocol swaps the underlying
            tokens at live prices; holders do nothing.
          </p>
        </div>

        <div className="border-divider pt-[calc(1.5*28px)] lg:border-l-2 lg:pl-[clamp(20px,3vw,36px)]">
          <h2 className="m-0 mb-4 text-xl tracking-[-0.01em]">
            Rebalance history
          </h2>
          {/* Empty by construction: the basket is a draft, so there are no
              transactions to list and none may be invented. */}
          <p className="m-0 text-[13px] leading-6 text-ink/70">
            No rebalances yet. Each one you publish is a single signature, and
            it lands here with its transaction hash.
          </p>

          <h2 className="m-0 mt-7 mb-4 text-xl tracking-[-0.01em]">Fees</h2>
          <div className="grid gap-3 text-[13.5px]">
            <div className="flex items-center justify-between gap-3 border-b border-divider pb-3 tnum">
              <span>Holding fee</span>
              <span className="font-heading font-extrabold">
                {STREAMING_FEE_LABEL} / yr
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-divider pb-3 tnum">
              <span>Mint / redeem fee</span>
              <span className="font-heading font-extrabold">
                {MINT_REDEEM_FEE_LABEL} each
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-divider pb-3 tnum">
              <span>Your share of every fee</span>
              <span className="font-heading font-extrabold text-accent-700">
                {CURATOR_SHARE_LABEL}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
              <span>Minting</span>
              <button
                type="button"
                onClick={() => setMintOpen((m) => !m)}
                className={`cursor-pointer border-2 border-ink px-3.5 py-1.5 font-heading font-extrabold text-[12px] tracking-[0.05em] ${mintOpen ? "bg-ink text-ground" : "bg-ground text-ink"}`}
              >
                {mintOpen ? "Open" : "Paused"}
              </button>
            </div>
            <p className="m-0 text-[11.5px] leading-[17px] text-ink/50">
              Rates are protocol-wide, timelocked 48 hours, and hard-capped in
              code. Pausing minting never blocks redemptions; holders can always
              exit.
            </p>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[480px] border-2 border-ink bg-ground p-8 shadow-lg"
          >
            {published ? (
              <>
                <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-700">
                  Published
                </span>
                <h2 className="mt-3 mb-0 font-heading font-extrabold text-[28px] tracking-[-0.015em]">
                  Rebalance is live.
                </h2>
                <p className="mt-3.5 mb-0 text-sm leading-[22px] text-ink/75">
                  Every holder notified. Underlying swaps execute at live prices
                  over the next few minutes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setPublished(false);
                    setDraft(null);
                  }}
                  className="mt-5.5 cursor-pointer border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm hover:bg-accent-600"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-700">
                  Confirm rebalance · one signature
                </span>
                <h2 className="mt-3 mb-0 font-heading font-extrabold text-[28px] tracking-[-0.015em]">
                  {changes.length} weights change
                </h2>
                <div className="mt-4 grid gap-1.5 text-[13.5px] tnum">
                  {changes.map((c) => (
                    <div key={c.sym} className="flex justify-between gap-3">
                      <span className="font-heading font-extrabold">
                        {c.sym}
                      </span>
                      <span>
                        {c.from} → {c.to}{" "}
                        <span className={c.up ? "text-gain" : "text-loss"}>
                          {c.diff}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 mb-0 text-[12px] leading-[18px] text-ink/55">
                  Estimated swap cost ≈ 0.04% of TVL, paid by the basket.
                  Holders are notified immediately.
                </p>
                <div className="mt-5.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPublished(true)}
                    className="cursor-pointer border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm hover:bg-accent-600"
                  >
                    Sign and publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="cursor-pointer border border-transparent px-3.5 py-2 font-heading font-extrabold text-accent text-sm hover:bg-accent/10"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
