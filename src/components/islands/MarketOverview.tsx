import type { ReactNode } from "react";
import { fmtAge, fmtCompactUsd, fmtCount } from "@/lib/format";
import { TOKENS } from "@/lib/tokens";
import { useTokenMarket } from "./use-live-market";

/** Ink-on-light by default; `dark` restyles it for the slab plate. */
export type OverviewTone = "light" | "dark";

const TONE = {
  light: {
    rule: "border-divider",
    label: "text-ink/55",
    value: "text-ink",
    note: "text-ink/60",
    meta: "text-ink/60",
    dot: "bg-accent",
  },
  dark: {
    rule: "border-ground/20",
    label: "text-ground/50",
    value: "text-ground",
    note: "text-ground/60",
    meta: "text-ground/60",
    dot: "bg-accent-300",
  },
} as const;

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  tone: OverviewTone;
}) {
  const t = TONE[tone];
  return (
    <div className={`border-l-2 pl-5 ${t.rule}`}>
      <p className={`mb-2 text-[11px] uppercase tracking-[0.1em] ${t.label}`}>
        {label}
      </p>
      <p
        className={`m-0 font-heading font-extrabold text-[clamp(22px,2.4vw,30px)] leading-none tracking-[-0.01em] tnum ${t.value}`}
      >
        {value}
      </p>
      {note && (
        <p className={`mt-2 mb-0 text-[12px] leading-5 ${t.note}`}>{note}</p>
      )}
    </div>
  );
}

/**
 * Market-wide totals. Coverage is stated next to every derived dollar figure:
 * only about a third of the registry has a Chainlink feed, so an unqualified
 * "total market cap" would quietly imply we can price all 96 tokens.
 */
export default function MarketOverview({
  tone = "light",
}: {
  tone?: OverviewTone;
}) {
  const m = useTokenMarket();
  const t = m.totals;
  const tokenCount = t?.tokenCount ?? TOKENS.length;
  const s = TONE[tone];

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-y-8 gap-x-7">
        <Stat
          tone={tone}
          label="Stock tokens"
          value={fmtCount(tokenCount)}
          note="Every asset in Robinhood's onchain registry"
        />
        <Stat
          tone={tone}
          label="Onchain market cap"
          value={fmtCompactUsd(t?.onchainMarketCap ?? null)}
          note={
            t
              ? `Supply x price across the ${t.pricedCount} tokens we can price`
              : "Tokens outstanding x verified price"
          }
        />
        <Stat
          tone={tone}
          label="In Uniswap pools"
          value={fmtCompactUsd(t?.poolTvl ?? null)}
          note={
            t
              ? `Stock tokens sitting in v4 pools, ${t.poolCount} with live depth`
              : "Stock tokens sitting in Uniswap v4 pools"
          }
        />
        <Stat
          tone={tone}
          label="Holder positions"
          value={fmtCount(t?.holderPositions ?? null)}
          note="Summed per token; one wallet holding two counts twice"
        />
      </div>

      <div
        className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 pt-5 text-[12px] ${s.rule} ${s.meta}`}
      >
        {t ? (
          <>
            <span className="flex items-center gap-2.5">
              <span className={`size-2.5 animate-pulse-live ${s.dot}`} />
              <span className="uppercase tracking-[0.08em]">
                Updated {fmtAge(t.updatedAt)}
              </span>
            </span>
            <span className="tnum">
              {t.feedCount} of {t.tokenCount} priced by a Chainlink feed
              {t.pricedCount > t.feedCount &&
                `, ${t.pricedCount - t.feedCount} more from a Uniswap pool`}
              . The remaining {t.tokenCount - t.pricedCount} have no price we
              will vouch for.
            </span>
          </>
        ) : (
          <span>
            Live market data is unavailable right now, so no prices are shown
            below. Contract addresses are always the real registry.
          </span>
        )}
      </div>
    </div>
  );
}
