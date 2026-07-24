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
  const sorted = [...quote.rails].sort((a, b) => (BigInt(b.buyAmount) > BigInt(a.buyAmount) ? 1 : -1));
  const bestAmt = sorted.length ? Number(formatUnits(BigInt(sorted[0].buyAmount), dec)) : 0;
  return sorted.map((r) => {
    const amount = Number(formatUnits(BigInt(r.buyAmount), dec));
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
