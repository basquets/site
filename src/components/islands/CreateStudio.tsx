import { useState } from "react";
import { Input } from "@/components/ui/input";
import { fmtUsd } from "@/lib/market";
import {
  CURATOR_SHARE_LABEL,
  curatorEarnings,
  MINT_REDEEM_FEE_LABEL,
  STREAMING_FEE_LABEL,
} from "@/lib/protocol";
import { TOKEN_SECTORS, TOKENS } from "@/lib/tokens";
import { useTokenMarket } from "./use-live-market";

// Product preview of the basket builder, driven by the real token registry.
const PALETTE = [
  "oklch(0.62 0.17 155)",
  "oklch(0.30 0.02 168)",
  "oklch(0.74 0.13 155)",
  "oklch(0.50 0.02 168)",
  "oklch(0.46 0.13 155)",
  "oklch(0.66 0.02 168)",
  "oklch(0.84 0.09 155)",
  "oklch(0.38 0.07 155)",
  "oklch(0.80 0.01 168)",
  "oklch(0.28 0.07 155)",
  "oklch(0.91 0.06 155)",
  "oklch(0.58 0.09 155)",
];

const stepBtn =
  "size-[26px] cursor-pointer border-2 border-ink bg-ground p-0 font-extrabold leading-none hover:bg-surface";

function equalized(order: string[]): Record<string, number> {
  const w: Record<string, number> = {};
  if (!order.length) return w;
  const base = Math.floor(100 / order.length);
  for (const k of order) w[k] = base;
  w[order[0]] += 100 - base * order.length;
  return w;
}

export default function CreateStudio() {
  const { hist, mode } = useTokenMarket();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [order, setOrder] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [bName, setBName] = useState("");
  const [bSym, setBSym] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const q = query.trim().toLowerCase();
  const list = TOKENS.filter(
    (t) =>
      (sector === "All" || t.sector === sector) &&
      (!q ||
        t.sym.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)),
  ).slice(0, 24);

  const toggle = (sym: string) => {
    if (order.includes(sym)) {
      const o = order.filter((s) => s !== sym);
      setOrder(o);
      setWeights(equalized(o));
    } else if (order.length < 20) {
      const o = [...order, sym];
      setOrder(o);
      setWeights(equalized(o));
    }
  };

  const bump = (sym: string, d: number) => {
    const w = { ...weights };
    w[sym] = Math.min(90, Math.max(1, w[sym] + d));
    const others = order.filter((s) => s !== sym);
    const rest = 100 - w[sym];
    const sumO = others.reduce((s, k) => s + w[k], 0) || 1;
    for (const k of others)
      w[k] = Math.max(1, Math.round((w[k] / sumO) * rest));
    const drift = 100 - order.reduce((s, k) => s + w[k], 0);
    if (others.length) w[others[0]] += drift;
    else w[sym] += drift;
    setWeights(w);
  };

  const totalW = order.reduce((s, k) => s + weights[k], 0);
  const okCount = order.length >= 3 && order.length <= 20;
  const okTotal = Math.round(totalW) === 100;
  const okMeta = bName.trim().length > 0 && bSym.trim().length > 0;
  const ready = okCount && okTotal && okMeta;
  // What the curator keeps per $1M that moves in or out, not per $1M held:
  // the streaming fee is zero, so holding generates nothing.
  const share = curatorEarnings(1_000_000);
  const holdings = order.map((sym, i) => ({
    sym,
    pct: Math.max(weights[sym], 1),
    pctLabel: `${weights[sym].toFixed(0)}%`,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-6 pt-[calc(1.75*28px)] pb-[calc(1.25*28px)]">
        <div>
          <span className="mb-3 block text-[13px] uppercase tracking-[0.08em] text-accent-700">
            Launch a basket
          </span>
          <h1 className="m-0 -ml-[0.058em] text-[clamp(32px,4vw,52px)] leading-[1.08] tracking-[-0.02em]">
            Build the recipe.
          </h1>
        </div>
        <div className="flex gap-7 text-[12px] uppercase tracking-[0.08em]">
          <span className={order.length ? "text-accent-700" : "text-ink/40"}>
            Recipe
          </span>
          <span className={okMeta ? "text-accent-700" : "text-ink/40"}>
            Terms
          </span>
          <span className={deployed ? "text-accent-700" : "text-ink/40"}>
            Deploy
          </span>
        </div>
      </section>

      <div className="grid items-start gap-x-[clamp(28px,4vw,56px)] border-t-2 border-divider pb-[calc(3*28px)] lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]">
        <div className="pt-7">
          <div className="mb-4.5 flex flex-wrap items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${TOKENS.length} tokenized stocks`}
              aria-label="Search tokens"
              className="min-w-[200px] flex-1 text-sm"
            />
            <div className="flex flex-wrap">
              {["All", ...TOKEN_SECTORS].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  className={`cursor-pointer border-none px-3 py-2 text-[12px] uppercase tracking-[0.05em] ${sector === s ? "bg-ink text-ground" : "bg-transparent text-ink hover:bg-surface"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t-2 border-divider">
            {list.map((t) => {
              const a = hist[t.sym];
              // Most of the registry has no price we trust; those rows still list
              // the token, they just do not pretend to quote it.
              const chg =
                a && a.length > 1 ? ((a.at(-1) ?? 0) / a[0] - 1) * 100 : null;
              const inB = order.includes(t.sym);
              return (
                <div
                  key={t.sym}
                  className="flex items-center gap-3.5 border-b border-divider py-2.5"
                >
                  <span className="w-[64px] flex-none font-heading font-extrabold text-sm">
                    {t.sym}
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink/78">
                    {t.name}
                  </span>
                  <span className="w-[70px] flex-none text-[11px] text-ink/50 uppercase tracking-[0.05em] max-sm:hidden">
                    {t.sector}
                  </span>
                  <span className="w-[82px] flex-none text-right text-[13px] tnum">
                    {a ? fmtUsd(a.at(-1) ?? 0) : "—"}
                  </span>
                  <span
                    className={`w-[64px] flex-none text-right text-[12px] tnum max-sm:hidden ${chg === null ? "text-ink/55" : chg >= 0 ? "text-gain" : "text-loss"}`}
                  >
                    {chg === null
                      ? "—"
                      : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(t.sym)}
                    className={`flex-none cursor-pointer border-2 border-ink px-3.5 py-1.5 font-heading font-extrabold text-[12px] tracking-[0.05em] ${inB ? "bg-ink text-ground" : "bg-ground text-ink hover:bg-surface"}`}
                  >
                    {inB ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
            {list.length === 0 && (
              <p className="m-0 py-6 text-[13.5px] text-ink/60">
                No tokens match "{query}".
              </p>
            )}
          </div>
          {!q && sector === "All" && (
            <p className="mt-2.5 mb-0 text-[11.5px] text-ink/50">
              Showing the first 24 of {TOKENS.length} registry tokens; search or
              filter to find the rest.
            </p>
          )}
        </div>

        <div className="border-divider pt-7 lg:sticky lg:top-0 lg:border-l-2 lg:pl-[clamp(20px,3vw,36px)]">
          <div className="flex gap-3">
            <div className="grid flex-1 gap-1.5">
              <label
                htmlFor="create-name"
                className="text-[11px] text-ink/60 uppercase tracking-[0.08em]"
              >
                Basket name
              </label>
              <Input
                id="create-name"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                placeholder="AI Infrastructure"
                className="text-sm"
              />
            </div>
            <div className="grid w-[110px] gap-1.5">
              <label
                htmlFor="create-sym"
                className="text-[11px] text-ink/60 uppercase tracking-[0.08em]"
              >
                Symbol
              </label>
              <Input
                id="create-sym"
                value={bSym}
                onChange={(e) => setBSym(e.target.value.toUpperCase())}
                placeholder="bAI"
                className="text-sm uppercase"
              />
            </div>
          </div>

          <div className="mt-6 mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.08em] text-accent-700 tnum">
              Holdings · {order.length} / 20
            </span>
            <button
              type="button"
              onClick={() => setWeights(equalized(order))}
              className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent-700 underline hover:text-accent-600"
            >
              Equal weights
            </button>
          </div>

          {order.length === 0 && (
            <div className="border-2 border-divider border-dashed p-7 px-5 text-[13.5px] leading-[21px] text-ink/55">
              Add 3-20 stocks from the left. Weights start equal; then shape
              them.
            </div>
          )}

          <div>
            {holdings.map((h) => (
              <div
                key={h.sym}
                className="flex items-center gap-2.5 border-b border-divider py-2"
              >
                <span
                  className="size-2.5 flex-none"
                  style={{ background: h.color }}
                />
                <span className="w-[58px] flex-none font-heading font-extrabold text-[13.5px]">
                  {h.sym}
                </span>
                <div className="relative h-2 flex-1 bg-surface">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${h.pct}%`, background: h.color }}
                  />
                </div>
                <span className="w-[48px] flex-none text-right text-[13px] tnum">
                  {h.pctLabel}
                </span>
                <div className="flex flex-none">
                  <button
                    type="button"
                    aria-label={`Decrease ${h.sym}`}
                    onClick={() => bump(h.sym, -5)}
                    className={stepBtn}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label={`Increase ${h.sym}`}
                    onClick={() => bump(h.sym, 5)}
                    className={`${stepBtn} border-l-0`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${h.sym}`}
                  onClick={() => toggle(h.sym)}
                  className="size-[26px] cursor-pointer border-none bg-transparent p-0 text-[15px] text-ink/45 hover:text-accent-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {order.length > 0 && (
            <div className="mt-3.5 flex h-3 gap-0.5">
              {holdings.map((h) => (
                <div
                  key={h.sym}
                  title={h.sym}
                  style={{ width: `${h.pct}%`, background: h.color }}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <span className="mb-2.5 block text-[11px] uppercase tracking-[0.08em] text-accent-700">
              Protocol fees · every basket
            </span>
            <div className="grid gap-1.5 text-[13px] tnum">
              <div className="flex justify-between gap-4">
                <span className="text-ink/60">Holding fee</span>
                <span>{STREAMING_FEE_LABEL} / yr on TVL</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/60">Mint / redeem fee</span>
                <span>{MINT_REDEEM_FEE_LABEL} each</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/60">Your share of every fee</span>
                <span className="font-heading font-extrabold text-accent-700">
                  {CURATOR_SHARE_LABEL}
                </span>
              </div>
            </div>
            <p className="mt-2.5 mb-0 text-[12px] leading-[18px] text-ink/55">
              Rates are protocol-wide, readable onchain, and hard-capped in
              code; you earn 60% of everything your basket generates.
            </p>
          </div>

          <hr className="mt-6 mb-4.5 h-0.5 border-0 bg-divider" />
          <div className="grid gap-2 text-[13px] tnum">
            <div className="flex justify-between">
              <span className="text-ink/60">Total weight</span>
              <span className={okTotal ? "text-accent-700" : "text-loss"}>
                {Math.round(totalW)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Your share at $1M TVL</span>
              <span>${Math.round(share).toLocaleString("en-US")} / yr</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              setReviewing(true);
              setDeployed(false);
            }}
            className="mt-5 w-full cursor-pointer border border-transparent bg-accent px-3.5 py-2 text-left font-heading font-extrabold text-ground text-sm hover:bg-accent-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
          >
            {!okCount
              ? order.length < 3
                ? "Add at least 3 stocks"
                : "Max 20 stocks"
              : !okMeta
                ? "Name your basket"
                : !okTotal
                  ? "Weights must total 100%"
                  : `Review and deploy ${bSym}`}
          </button>
          <p className="mt-3 mb-0 text-[11.5px] leading-[17px] text-ink/50">
            Deploying publishes the recipe onchain. You can rebalance later;
            every change is public.
          </p>
        </div>
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-[520px] overflow-auto border-2 border-ink bg-ground p-8 shadow-lg"
          >
            {deployed ? (
              <>
                <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-700">
                  Deployed · Robinhood Chain
                </span>
                <h2 className="mt-3 mb-0 font-heading font-extrabold text-[30px] tracking-[-0.015em]">
                  {bName} is live.
                </h2>
                <p className="mt-3.5 mb-0 text-sm leading-[23px] text-ink/75">
                  {bSym} can now be minted by anyone. Fees start streaming to
                  your wallet the moment the first zap lands. (Product preview;
                  nothing was deployed.)
                </p>
                {/* A plausible-looking address here would read as a real
                    deployment. There is none, so the slot says so. */}
                <div className="mt-4.5 bg-surface px-3.5 py-3 text-[12.5px] text-ink/60">
                  The basket's contract address would appear here, once
                  deployed.
                </div>
                <div className="mt-5.5 flex gap-3">
                  <a
                    href="/baskets/bai10"
                    className="border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm no-underline hover:bg-accent-600"
                  >
                    See a live basket page
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewing(false);
                      setDeployed(false);
                    }}
                    className="cursor-pointer border border-transparent px-3.5 py-2 font-heading font-extrabold text-accent text-sm hover:bg-accent/10"
                  >
                    Build another
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-700">
                  Review · one signature
                </span>
                <h2 className="mt-3 mb-0 font-heading font-extrabold text-[30px] tracking-[-0.015em]">
                  {bName} <span className="text-ink/45">· {bSym}</span>
                </h2>
                <div className="mt-4.5 mb-1.5 flex h-3 gap-0.5">
                  {holdings.map((h) => (
                    <div
                      key={h.sym}
                      title={h.sym}
                      style={{ width: `${h.pct}%`, background: h.color }}
                    />
                  ))}
                </div>
                <div className="mt-3 grid gap-1.5 text-[13.5px] tnum">
                  {holdings.map((h) => (
                    <div key={h.sym} className="flex justify-between gap-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-[9px]"
                          style={{ background: h.color }}
                        />
                        <span className="font-heading font-extrabold">
                          {h.sym}
                        </span>
                      </span>
                      <span>{h.pctLabel}</span>
                    </div>
                  ))}
                </div>
                <hr className="mt-4.5 mb-3.5 h-0.5 border-0 bg-divider" />
                <div className="grid gap-1.5 text-[13.5px] tnum">
                  <div className="flex justify-between">
                    <span className="text-ink/60">Holding fee</span>
                    <span>
                      {STREAMING_FEE_LABEL} / yr on TVL · protocol rate
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/60">
                      Your share ({CURATOR_SHARE_LABEL})
                    </span>
                    <span className="text-accent-700">
                      ${Math.round(share).toLocaleString("en-US")} per $1M
                      minted or redeemed
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/60">Network</span>
                    <span>Robinhood Chain</span>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeployed(true)}
                    className="cursor-pointer border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm hover:bg-accent-600"
                  >
                    Sign and deploy
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewing(false)}
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
