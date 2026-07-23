import { describe, expect, test } from "bun:test";
import { minBuyAmount } from "./min-buy";

describe("minBuyAmount", () => {
  const oneToken = 1_000_000_000_000_000_000n; // 1e18

  test("0.1% preset scales by 999000/1e6", () => {
    expect(minBuyAmount(1_000_000n, 0.001)).toBe(999_000n);
    expect(minBuyAmount(oneToken, 0.001)).toBe(999_000_000_000_000_000n);
  });

  test("0.5% preset scales by 995000/1e6", () => {
    expect(minBuyAmount(1_000_000n, 0.005)).toBe(995_000n);
    expect(minBuyAmount(oneToken, 0.005)).toBe(995_000_000_000_000_000n);
  });

  test("1% preset scales by 990000/1e6", () => {
    expect(minBuyAmount(1_000_000n, 0.01)).toBe(990_000n);
    expect(minBuyAmount(oneToken, 0.01)).toBe(990_000_000_000_000_000n);
  });

  test("rounds down: a dust buy amount floors to zero rather than over-promising", () => {
    expect(minBuyAmount(1n, 0.005)).toBe(0n);
    expect(minBuyAmount(1000n, 0.005)).toBe(995n);
  });

  test("zero slippage returns the full amount", () => {
    expect(minBuyAmount(oneToken, 0)).toBe(oneToken);
  });
});
