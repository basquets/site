import type { ApiToken } from "@basquets/api-client";
import { fmtCompactUsd, fmtCount, fmtFeeTier, fmtTokens } from "@/lib/format";

const row = (label: string, value: string) => (
  <div className="flex items-baseline justify-between px-5 py-2 text-[13px]">
    <span className="text-ink/60">{label}</span>
    <span className="tnum">{value}</span>
  </div>
);

/** Mini fact sheet for the picked buy token — fills the contextual column
 *  before an amount produces a quote. All figures come from the market store's
 *  API row; the caller skips rendering when that row is absent. */
export default function TokenFactsCard({
  token,
  change,
}: {
  token: ApiToken;
  change: number | null; // fraction vs 24h base; null = unknown
}) {
  const price =
    token.price != null
      ? `$${token.price.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";
  const changeTxt =
    change != null
      ? `${change >= 0 ? "+" : ""}${(change * 100).toFixed(2)}%`
      : "";
  return (
    <div className="border-2 border-ink bg-ground self-start">
      <p className="m-0 border-b-2 border-divider px-5 py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink/55">
        {/* registry names carry a "• Robinhood Token" suffix; one separator per line is enough */}
        {token.symbol} · {token.name.split("•")[0].trim()}
      </p>
      {row("Price", changeTxt ? `${price} (${changeTxt})` : price)}
      {row("Tokens outstanding", fmtTokens(token.stats.totalSupply))}
      {row("Onchain market cap", fmtCompactUsd(token.stats.onchainMarketCap))}
      {row("Holders", fmtCount(token.stats.holders))}
      {row("Pool fee", fmtFeeTier(token.stats.poolFee))}
      <p className="m-0 border-t-2 border-dashed border-divider px-5 py-2.5 text-[12px] leading-5 text-ink/60">
        Enter an amount to see a live quote and how deep the pool runs.
      </p>
    </div>
  );
}
