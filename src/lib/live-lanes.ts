import type { ApiQuote } from "@basquets/api-client";
import { formatUnits } from "viem";

export interface LaneRow {
  rail: string;
  amount: number;
  deltaBps: number;
  isBest: boolean;
  hops: number | null;
}

export function laneRows(quote: ApiQuote): LaneRow[] {
  const dec = quote.buy.decimals;
  const amt = (b: string) => Number(formatUnits(BigInt(b), dec));
  // The API's chosen rail is the single source of "best"; the display anchors to it.
  const bestRail = quote.rails.find((r) => r.rail === quote.best) ?? quote.rails[0];
  const bestAmt = bestRail ? amt(bestRail.buyAmount) : 0;
  const sorted = [...quote.rails].sort((a, b) => {
    if (a.rail === quote.best) return -1; // chosen best always leads
    if (b.rail === quote.best) return 1;
    const av = BigInt(a.buyAmount);
    const bv = BigInt(b.buyAmount);
    return bv > av ? 1 : bv < av ? -1 : 0; // then by gross output, desc
  });
  return sorted.map((r) => {
    const amount = amt(r.buyAmount);
    return {
      rail: r.rail,
      amount,
      deltaBps: bestAmt > 0 ? Math.round(((amount - bestAmt) / bestAmt) * 10000) : 0,
      isBest: r.rail === quote.best,
      hops: r.hops?.length ?? null,
    };
  });
}

export function shouldFallback(status: "idle" | "loading" | "ready" | "error", railCount: number): boolean {
  if (status === "loading") return false;
  if (status === "ready") return railCount < 1;
  return true;
}
