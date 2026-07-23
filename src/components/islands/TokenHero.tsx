import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { fmtUsd, sparkPath } from "@/lib/market";
import { BLOCKSCOUT, TOKEN_BY_SYM } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { tokenChange, useTokenMarket } from "./use-live-market";

export default function TokenHero({ sym }: { sym: string }) {
  const m = useTokenMarket();
  const token = TOKEN_BY_SYM[sym];
  const a = m.hist[sym];
  const hasFeed = a && a.length > 0;
  // A pool-priced token contributes a single reading, so there is no series to
  // chart and nothing that could honestly be called "48 oracle updates".
  const series = a && a.length > 1 ? a : null;
  const price = m.tokens[sym]?.price ?? null;
  // The source belongs next to the number, not in a footnote: a Chainlink
  // reading and a Uniswap spot rate are not the same claim.
  const sourceLine = !price
    ? "No verified price for this token"
    : price.source === "pool"
      ? "Uniswap v4 spot · no Chainlink feed for this token"
      : price.stale
        ? "Chainlink oracle · last update is not recent"
        : "Chainlink oracle · updates onchain 24/5";
  const kind = token.sector === "ETF" ? "fund" : "stock";
  return (
    <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-end gap-y-10 gap-x-[clamp(32px,5vw,88px)]">
      <div>
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h1 className="m-0 -ml-[0.058em] text-[clamp(48px,6vw,84px)] leading-none tracking-[-0.02em]">
            {sym}
          </h1>
          <Badge variant="neutral">{token.sector}</Badge>
        </div>
        <p className="mt-3.5 mb-0 text-[17px] leading-7 text-ink/78">
          {token.name}. The real US-listed {kind}, tokenized by Robinhood, held
          in your wallet.
        </p>
        {hasFeed ? (
          <>
            <div className="mt-7 flex items-baseline gap-4">
              <span className="font-heading font-extrabold text-[clamp(40px,4.5vw,64px)] tracking-[-0.01em] tnum">
                {fmtUsd(a.at(-1) ?? 0)}
              </span>
              {(() => {
                const chg = tokenChange(m, sym);
                if (chg === null) return null;
                const up = chg >= 0;
                return (
                  <span
                    className={`text-[17px] tnum ${up ? "text-gain" : "text-loss"}`}
                  >
                    {up ? "▲ +" : "▼ "}
                    {(chg * 100).toFixed(2)}%
                  </span>
                );
              })()}
            </div>
            <div className="mt-3.5 flex items-center gap-2.5 text-xs uppercase tracking-[0.08em] text-ink/70">
              <span className="size-2.5 bg-accent animate-pulse-live" />
              <span>{sourceLine}</span>
            </div>
          </>
        ) : (
          <div className="mt-7 max-w-[46ch] text-xs uppercase tracking-[0.08em] text-ink/70">
            No price we will vouch for: this token has no Chainlink feed and no
            Uniswap pool with real depth
          </div>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="/curators"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            Create a basket
          </a>
          <a
            href={`${BLOCKSCOUT}/address/${token.address}`}
            target="_blank"
            rel="noopener"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            View contract
          </a>
        </div>
      </div>
      {series && (
        <div>
          <svg
            viewBox="0 0 240 80"
            preserveAspectRatio="none"
            className="block h-[180px] w-full"
            aria-hidden="true"
          >
            <path
              d={sparkPath(series, 240, 80)}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={1.2}
            />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.08em] text-ink/55 tnum">
            <span>Last {series.length} oracle updates</span>
            <span>
              {fmtUsd(Math.min(...series))} to {fmtUsd(Math.max(...series))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
