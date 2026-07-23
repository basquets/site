import { describe, expect, test } from "bun:test";
import type { ApiToken } from "@basquets/api-client";
import { applyTick, marketFromTokens, tokenChange } from "./use-live-market";

const NVDA: ApiToken = {
  symbol: "NVDA",
  name: "NVIDIA",
  address: "0xaaa1",
  status: "ACTIVE",
  feedAddress: "0xfeed1",
  price: {
    value: 182.4,
    change24h: 0.0133,
    updatedAt: "2026-07-21T14:00:00Z",
    stale: false,
    source: "chainlink",
  },
  spark: [180.1, 181.0, 182.4],
  stats: {
    totalSupply: 13_963.6,
    poolBalance: 6_267.5,
    poolShare: 0.449,
    poolFee: 3000,
    poolLiquidity: "5000",
    holders: 23_624,
    onchainMarketCap: 13_963.6 * 182.4,
    updatedAt: "2026-07-21T14:00:00Z",
  },
};
const NOFEED: ApiToken = {
  symbol: "ZZZZ",
  name: "No Feed",
  address: "0xbbb2",
  status: "ACTIVE",
  feedAddress: null,
  price: null,
  spark: [],
  stats: {
    totalSupply: 50,
    poolBalance: null,
    poolShare: null,
    poolFee: null,
    poolLiquidity: null,
    holders: null,
    onchainMarketCap: null,
    updatedAt: "2026-07-21T14:00:00Z",
  },
};

describe("use-live-market", () => {
  test("builds hist only for priced tokens and keeps a 24h base", () => {
    const m = marketFromTokens([NVDA, NOFEED]);
    expect(m.mode).toBe("live");
    expect(m.hist.NVDA as number[]).toEqual([180.1, 181.0, 182.4]);
    expect(m.hist.ZZZZ).toBeUndefined();
    expect(tokenChange(m, "NVDA")).toBeCloseTo(0.0133, 4);
  });

  test("reports an unknown change instead of zero when there is no 24h base", () => {
    const noHistory: ApiToken = {
      ...NVDA,
      price: { ...NVDA.price!, change24h: null },
      spark: [182.4],
    };
    const m = marketFromTokens([noHistory]);
    expect(m.hist.NVDA).toEqual([182.4]);
    expect(tokenChange(m, "NVDA")).toBeNull();
  });

  test("applyTick appends, caps at 48 points, updates change vs 24h base", () => {
    let m = marketFromTokens([NVDA, NOFEED]);
    m = applyTick(m, {
      symbol: "NVDA",
      value: 190.0,
      updatedAt: "2026-07-21T15:00:00Z",
    });
    expect(m.hist.NVDA?.at(-1)).toBe(190.0);
    const base = 182.4 / 1.0133; // implied 24h-ago price
    expect(tokenChange(m, "NVDA")).toBeCloseTo(190.0 / base - 1, 4);
    // unknown symbol tick is ignored
    expect(
      applyTick(m, { symbol: "ZZZZ", value: 1, updatedAt: "" }).hist.ZZZZ,
    ).toBeUndefined();
  });
});
