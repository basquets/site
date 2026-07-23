import { fmtCompactUsd, fmtCount } from "@/lib/format";
import { fmtUsd } from "@/lib/market";
import { TOKENS } from "@/lib/tokens";
import AwaitingMarket from "./AwaitingMarket";
import {
  type TokenMarket,
  tokenChange,
  useTokenMarket,
} from "./use-live-market";

/** Twelve names wide enough to read as "a market", not "a shortlist". */
const SHELF_SYMS = [
  "NVDA",
  "TSLA",
  "AAPL",
  "MSFT",
  "AMZN",
  "GOOGL",
  "META",
  "SPY",
  "COIN",
  "AMD",
  "NFLX",
  "PLTR",
];

/** Sparkline path across a 0..100 × 0..28 box, flat line when the series is
 *  too short or perfectly still. */
function sparkPath(series: number[]): string {
  const pts = series.slice(-32);
  if (pts.length < 2) return "M0 14 L100 14";
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 26 - ((v - lo) / span) * 24;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** The four figures that answer "what is actually on this chain". Falls back to
 *  the registry count alone in simulation mode, where totals are absent. */
function stats(m: TokenMarket) {
  const t = m.totals;
  return [
    { label: "Stock tokens", value: fmtCount(t?.tokenCount ?? TOKENS.length) },
    { label: "Priced live", value: t ? fmtCount(t.pricedCount) : "—" },
    {
      label: "Onchain market cap",
      value: t ? fmtCompactUsd(t.onchainMarketCap) : "—",
    },
    { label: "In Uniswap v4 pools", value: t ? fmtCompactUsd(t.poolTvl) : "—" },
  ];
}

/** Twelve cells fill the 6-wide grid exactly. Preferred names come first, then
 *  anything else the feed carries, so a quiet name never leaves a hole. Cells
 *  need a few points or the sparkline draws as a dead flat line. */
function shelfSymbols(m: TokenMarket): string[] {
  const others = Object.keys(m.hist).filter((s) => !SHELF_SYMS.includes(s));
  return [...SHELF_SYMS, ...others]
    .filter((s) => (m.hist[s]?.length ?? 0) > 3)
    .slice(0, 12);
}

/**
 * The dark-slab inventory: aggregate figures over a grid of live token cells.
 * Ink-plate styling only — this component is not used on light surfaces.
 */
export default function TokenShelf() {
  const m = useTokenMarket();
  const shown = shelfSymbols(m);
  if (!shown.length) return <AwaitingMarket mode={m.mode} />;
  const rest = TOKENS.length - shown.length;

  return (
    <div>
      <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-ground/20 py-6 lg:grid-cols-4">
        {stats(m).map((s) => (
          <div key={s.label}>
            <dt className="m-0 text-[11px] uppercase tracking-[0.1em] text-ground/50">
              {s.label}
            </dt>
            <dd className="m-0 mt-1.5 font-heading font-extrabold text-[clamp(22px,2.2vw,28px)] text-ground tnum">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid grid-cols-2 gap-px bg-ground/15 sm:grid-cols-3 lg:grid-cols-6">
        {shown.map((sym) => {
          const series = m.hist[sym] as number[];
          const chg = tokenChange(m, sym);
          const up = chg === null ? null : chg >= 0;
          const stroke =
            up === null
              ? "color-mix(in oklch, var(--color-ground) 45%, transparent)"
              : up
                ? "var(--color-accent-300)"
                : "var(--color-red-300, #fca5a5)";
          return (
            <a
              key={sym}
              href={`/stocks/${sym.toLowerCase()}`}
              className="group flex flex-col gap-2 bg-ink px-4 py-4 text-ground no-underline transition-colors tnum hover:bg-ground/8"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-heading font-extrabold text-[15px]">
                  {sym}
                </span>
                <span
                  className={`text-[12px] ${up === null ? "text-ground/50" : up ? "text-accent-300" : "text-red-300"}`}
                >
                  {chg === null
                    ? "—"
                    : `${up ? "+" : ""}${(chg * 100).toFixed(2)}%`}
                </span>
              </span>
              <svg
                viewBox="0 0 100 28"
                preserveAspectRatio="none"
                className="block h-7 w-full"
                aria-hidden="true"
              >
                <path
                  d={sparkPath(series)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="text-[13px] text-ground/75">
                {fmtUsd(series.at(-1) ?? 0)}
              </span>
            </a>
          );
        })}
        {/* Spans the row so the grid closes on a bar rather than an orphan cell. */}
        <a
          href="/stocks"
          className="col-span-full flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-accent-500/20 px-4 py-4 text-ground no-underline transition-colors hover:bg-accent-500/30"
        >
          <span className="font-heading font-extrabold text-[15px] text-accent-300">
            +{rest} more stock tokens →
          </span>
          <span className="text-[12px] text-ground/60">
            Prices, supply, holders and pool depth for every one
          </span>
        </a>
      </div>
    </div>
  );
}
