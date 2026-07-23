import { ALL_BASKETS, basketView, navSeries } from "@/lib/market";
import {
  CURATOR_SHARE_LABEL,
  curatorEarnings,
  STREAMING_FEE_LABEL,
} from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

/**
 * Product preview of the curator dashboard, shelved with our own launch lineup
 * — the only baskets that exist. Their NAV and sparkline come from live
 * component prices; every business figure is zero because nothing is deployed
 * yet. A dashboard at zero is the truth on day one, and it beats inventing a
 * TVL nobody has contributed. Curator economics use the FeeController launch
 * rates (see src/lib/protocol.ts).
 */
const DEFS = ALL_BASKETS.map((b) => ({
  sym: b.symbol,
  name: `${b.name} · ${Object.keys(b.recipe).length} stocks`,
  def: b,
  // Zero until a basket is actually deployed and someone mints into it.
  tvl: 0,
  // Dollars minted plus dollars redeemed. This, not TVL, is what pays a
  // curator: the streaming fee ships at zero, so a basket that is merely held
  // earns nobody anything.
  flow: 0,
}));

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const statLabel = "m-0 text-[11px] uppercase tracking-[0.08em] text-ink/55";

function sparkPath(a: number[]) {
  const min = Math.min(...a);
  const max = Math.max(...a);
  const rg = max - min || 1;
  return a
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i / (a.length - 1)) * 120).toFixed(1)} ${(31 - ((v - min) / rg) * 28).toFixed(1)}`,
    )
    .join(" ");
}

export default function StudioPanel() {
  const { hist, mode } = useTokenMarket();

  const baskets = DEFS.map((d) => {
    const view = basketView(d.def, hist);
    return {
      ...d,
      view,
      spark: view ? sparkPath(navSeries(d.def, hist)) : "",
      navFmt: view ? view.nav : "—",
      chg: view?.chg ?? "—",
      up: view?.up ?? null,
      tvlFmt: d.tvl === 0 ? "$0" : `$${(d.tvl / 1_000_000).toFixed(1)}M`,
      earn: money(curatorEarnings(d.flow)),
    };
  });
  const totalTvl = DEFS.reduce((s, d) => s + d.tvl, 0);
  const earned = DEFS.reduce((s, d) => s + curatorEarnings(d.flow), 0);
  // No basket is deployed, so there is no fee history and no activity to show.
  // A dashboard at zero is the truth on day one; inventing a revenue chart and a
  // feed of trades that never happened is not.

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-6 pt-[calc(2*28px)] pb-[calc(1.5*28px)]">
        <div>
          <span className="mb-3 block text-[13px] uppercase tracking-[0.08em] text-accent-700 tnum">
            Curator studio preview
          </span>
          <h1 className="m-0 -ml-[0.058em] text-[clamp(32px,4vw,52px)] leading-[1.08] tracking-[-0.02em]">
            Good morning, @basquets
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-800 tracking-[0.02em]">
            Genesis curator · {CURATOR_SHARE_LABEL} of every fee
          </span>
          <a
            href="/create"
            className="border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm no-underline hover:bg-accent-600 active:translate-y-px"
          >
            New basket
          </a>
        </div>
      </section>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-y-2 border-divider">
        {[
          {
            l: `Total TVL · ${DEFS.length} baskets`,
            v: totalTvl === 0 ? "$0" : `$${(totalTvl / 1_000_000).toFixed(2)}M`,
          },
          { l: "Fees earned · all time", v: money(earned), accent: true },
          { l: "Holding fee", v: `${STREAMING_FEE_LABEL} / yr` },
          { l: "Holders", v: "0" },
        ].map((s, i) => (
          <div
            key={s.l}
            className={`py-5.5 ${i === 0 ? "pr-6" : "px-6"} ${i < 3 ? "border-r border-divider" : ""}`}
          >
            <p className={statLabel}>{s.l}</p>
            <p
              className={`mt-2 mb-0 font-heading font-extrabold text-[clamp(26px,2.6vw,36px)] tnum ${s.accent ? "text-accent-700" : ""}`}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <section className="py-[calc(1.75*28px)]">
        <h2 className="m-0 mb-5 text-2xl tracking-[-0.01em]">Your baskets</h2>
        <div className="border-t-2 border-divider">
          {baskets.map((b) => (
            <div
              key={b.sym}
              className="grid items-center gap-4 border-b-2 border-divider py-5 md:grid-cols-[minmax(180px,2.2fr)_minmax(120px,1.4fr)_repeat(3,minmax(90px,1fr))_auto]"
            >
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-heading font-extrabold text-lg">
                    {b.sym}
                  </span>
                  <span className="bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-800 uppercase tracking-[0.05em]">
                    Draft
                  </span>
                </div>
                <p className="mt-1 mb-0 text-[13px] text-ink/65">{b.name}</p>
              </div>
              <svg
                viewBox="0 0 120 34"
                preserveAspectRatio="none"
                className="block h-[34px] w-full max-w-[150px]"
                aria-hidden="true"
              >
                <path
                  d={b.spark}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={1.4}
                />
              </svg>
              <div>
                <p className={statLabel}>NAV</p>
                {b.view ? (
                  <p className="mt-1 mb-0 text-[14.5px] tnum">
                    {b.navFmt}{" "}
                    <span
                      className={`text-[12px] ${b.up === null ? "text-ink/55" : b.up ? "text-gain" : "text-loss"}`}
                    >
                      {b.chg}
                    </span>
                  </p>
                ) : (
                  <AwaitingMarket mode={mode} subject="NAV" className="py-1" />
                )}
              </div>
              <div>
                <p className={statLabel}>TVL</p>
                <p className="mt-1 mb-0 text-[14.5px] tnum">{b.tvlFmt}</p>
              </div>
              <div>
                <p className={statLabel}>Your fees</p>
                <p className="mt-1 mb-0 text-[14.5px] text-accent-700 tnum">
                  {b.earn}
                </p>
              </div>
              <a
                href="/manage"
                className="whitespace-nowrap border border-divider px-3.5 py-2 font-heading font-extrabold text-ink text-sm no-underline hover:bg-ink/7 active:bg-ink/14"
              >
                Manage
              </a>
            </div>
          ))}
          <a
            href="/create"
            className="flex items-center gap-3.5 border-b-2 border-divider py-5 text-ink/55 text-sm no-underline hover:text-accent-700"
          >
            <span className="font-heading font-extrabold text-xl leading-none">
              +
            </span>
            Launch a new basket; the recipe takes minutes
          </a>
        </div>
      </section>

      <div className="grid gap-x-[clamp(32px,5vw,72px)] gap-y-10 border-t-2 border-divider py-[calc(1.75*28px)] pb-[calc(3*28px)] lg:grid-cols-2">
        <div>
          <h2 className="m-0 mb-5 text-2xl tracking-[-0.01em]">Fee stream</h2>
          <p className="m-0 text-[13px] leading-6 text-ink/70">
            Nothing streamed yet — no basket has been deployed. Once one is,
            fees accrue per block and stream straight to your wallet; nothing to
            claim, nothing held by us.
          </p>
        </div>
        <div>
          <h2 className="m-0 mb-5 text-2xl tracking-[-0.01em]">
            Recent activity
          </h2>
          <p className="m-0 text-[13px] leading-6 text-ink/70">
            No mints, redemptions or fee payments yet. Every one that happens
            will appear here, read from the chain.
          </p>
        </div>
      </div>
    </div>
  );
}
