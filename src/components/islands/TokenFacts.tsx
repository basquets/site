import type { ReactNode } from "react";
import {
  fmtAge,
  fmtCompactUsd,
  fmtCount,
  fmtFeeTier,
  fmtPct,
  fmtTokens,
} from "@/lib/format";
import { ALL_BASKETS } from "@/lib/market";
import { BLOCKSCOUT, TOKEN_BY_SYM } from "@/lib/tokens";
import { useTokenMarket } from "./use-live-market";

function Fact({
  label,
  children,
  note,
}: {
  label: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="border-l-2 border-divider pl-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-ink/55">
        {label}
      </p>
      <p className="m-0 font-heading font-extrabold text-xl tnum">{children}</p>
      {note && (
        <p className="mt-1.5 mb-0 text-[12px] leading-5 text-ink/60">{note}</p>
      )}
    </div>
  );
}

/**
 * What is actually onchain for this token. Every figure is an exact contract
 * read except the holder count, which an explorer indexes for us — so it says so.
 */
export default function TokenFacts({ sym }: { sym: string }) {
  const m = useTokenMarket();
  const token = TOKEN_BY_SYM[sym];
  const api = m.tokens[sym];
  const s = api?.stats;
  const inBaskets = ALL_BASKETS.filter((b) => b.recipe[sym]).length;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-y-8 gap-x-7">
      <Fact
        label="Tokens outstanding"
        note="Total supply, read from the contract"
      >
        {fmtTokens(s?.totalSupply)}
      </Fact>
      <Fact
        label="Onchain market cap"
        note="Supply x price. Not the company's market cap"
      >
        {fmtCompactUsd(s?.onchainMarketCap)}
      </Fact>
      <Fact label="Holders" note="Indexed by Blockscout, not read by us">
        {fmtCount(s?.holders)}
      </Fact>
      <Fact
        label="In Uniswap pools"
        note={
          s?.poolFee != null
            ? `Deepest pool charges ${fmtFeeTier(s.poolFee)}`
            : "Share of supply held by the v4 PoolManager"
        }
      >
        {fmtPct(s?.poolShare)}
      </Fact>
      <Fact label="Standard" note="Beacon proxy on Robinhood's shared beacon">
        ERC-20
      </Fact>
      <Fact label="In baskets" note="Recipes that currently include it">
        {inBaskets}
      </Fact>
      <Fact
        label="Canonical contract"
        note="Verify this before you buy anywhere"
      >
        <a
          href={`${BLOCKSCOUT}/address/${token.address}`}
          target="_blank"
          rel="noopener"
          className="break-all text-[13px] text-accent-700"
        >
          {token.address.slice(0, 10)}…{token.address.slice(-8)}
        </a>
      </Fact>
      <Fact
        label="Data freshness"
        note={
          api?.price
            ? `Price from ${api.price.source === "pool" ? "a Uniswap v4 pool" : "a Chainlink feed"}`
            : "No price source we will vouch for"
        }
      >
        {fmtAge(s?.updatedAt)}
      </Fact>
    </div>
  );
}
