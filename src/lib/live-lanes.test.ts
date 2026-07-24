import { describe, expect, test } from "bun:test";
import type { ApiQuote } from "@basquets/api-client";
import { laneRows, shouldFallback } from "./live-lanes";

function q(
  rails: { rail: string; buyAmount: string }[],
  best: string,
): ApiQuote {
  return {
    sell: { address: "0x", symbol: "USDG", decimals: 6, amount: "1000000000" },
    buy: { address: "0x", symbol: "NVDA", decimals: 18 },
    mid: null,
    impact: null,
    depth: null,
    rails: rails.map((r) => ({
      ...r,
      gasEstimate: null,
      hops: null,
      tx: null,
    })),
    best: best as ApiQuote["best"],
    fetchedAt: "2026-07-24T00:00:00Z",
  } as ApiQuote;
}

describe("laneRows", () => {
  test("sorts best-first and computes each row's delta vs best in bps", () => {
    const rows = laneRows(
      q(
        [
          { rail: "lifi", buyAmount: "4788200000000000000" },
          { rail: "v4", buyAmount: "4800200000000000000" },
          { rail: "rialto", buyAmount: "4796900000000000000" },
        ],
        "v4",
      ),
    );
    expect(rows.map((r) => r.rail)).toEqual(["v4", "rialto", "lifi"]);
    expect(rows[0].isBest).toBe(true);
    expect(rows[0].deltaBps).toBe(0);
    expect(rows[1].deltaBps).toBe(-7);
    expect(rows[2].deltaBps).toBe(-25);
    expect(rows[0].amount).toBeCloseTo(4.8002, 4);
  });
  test("spread: worst row delta is negative", () => {
    const rows = laneRows(
      q(
        [
          { rail: "v4", buyAmount: "4800200000000000000" },
          { rail: "lifi", buyAmount: "4788200000000000000" },
        ],
        "v4",
      ),
    );
    expect(rows[rows.length - 1].deltaBps).toBe(-25);
  });
  test("anchors to quote.best even when it isn't the max-output rail", () => {
    const rows = laneRows(
      q(
        [
          { rail: "v4", buyAmount: "4800200000000000000" }, // highest gross output
          { rail: "rialto", buyAmount: "4796900000000000000" }, // chosen best (e.g. net-of-gas)
        ],
        "rialto",
      ),
    );
    expect(rows[0].rail).toBe("rialto");
    expect(rows[0].isBest).toBe(true);
    expect(rows[0].deltaBps).toBe(0);
    // v4 has MORE gross output than the chosen best, so its delta is positive
    expect(rows[1].rail).toBe("v4");
    expect(rows[1].deltaBps).toBe(7);
  });
});

describe("shouldFallback", () => {
  test("falls back on error, idle, or <1 rail; not while loading", () => {
    expect(shouldFallback("error", 3)).toBe(true);
    expect(shouldFallback("idle", 3)).toBe(true);
    expect(shouldFallback("ready", 0)).toBe(true);
    expect(shouldFallback("ready", 1)).toBe(false);
    expect(shouldFallback("loading", 0)).toBe(false);
  });
});
