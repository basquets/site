import { describe, expect, test } from "bun:test";
import {
  ALL_BASKETS,
  BASKET_DEFS,
  basketView,
  COMPONENT_FLOAT_USD,
  CURATORS,
  FEED_SYMBOLS,
  fmtUsd,
  type History,
  maxWeight,
  sparkPath,
  TICKER_SYMBOLS,
} from "./market";
import { TOKEN_BY_SYM } from "./tokens";

/**
 * Chainlink prices at the 2026-07-21 snapshot in
 * research/component-liquidity-2026-07-21.json — the vintage the house recipes
 * were sized against. They live here rather than in market.ts because that file
 * must never carry a price a visitor could end up seeing.
 */
const SNAPSHOT_PRICE_USD: Record<string, number> = {
  NVDA: 206.32,
  TSLA: 378.13,
  SPCX: 123.11,
  AAPL: 327.6973,
  AMZN: 248.0319,
  SNDK: 1554.75,
  GOOGL: 349.22,
  MSFT: 398.43,
  SPY: 747.06,
  META: 648.53,
};

/** The baskets Basquets curates itself at launch. */
const HOUSE_BASKETS = ALL_BASKETS.filter((b) => b.curatorHandle === "basquets");

/** Weight of each component as a fraction of NAV, at snapshot prices. */
function snapshotWeights(recipe: Record<string, number>): [string, number][] {
  const usd = Object.entries(recipe).map(
    ([sym, units]) => [sym, units * SNAPSHOT_PRICE_USD[sym]] as const,
  );
  const nav = usd.reduce((acc, [, v]) => acc + v, 0);
  return usd.map(([sym, v]) => [sym, v / nav]);
}

/** Stands in for what the API returns: a price series per symbol, nothing else. */
function history(prices: Record<string, number[]>): History {
  return prices;
}

/** Every component of every sample basket, each with a flat 48-point series. */
function pricedAll(value = 100): History {
  const hist: History = {};
  for (const b of ALL_BASKETS) {
    for (const sym of Object.keys(b.recipe)) {
      hist[sym] = Array.from({ length: 48 }, () => value);
    }
  }
  return hist;
}

describe("basket definitions", () => {
  // ComponentRegistry requires a Chainlink feed per component and NAVOracle
  // fails closed without one, so a recipe naming a feedless token is a basket
  // the protocol could never create. See research/component-liquidity.md.
  test("every recipe component is a registry token with a price feed", () => {
    for (const basket of ALL_BASKETS) {
      for (const sym of Object.keys(basket.recipe)) {
        expect(TOKEN_BY_SYM[sym]).toBeDefined();
        expect(FEED_SYMBOLS).toContain(sym);
      }
    }
  });

  test("the ticker only quotes feed-backed symbols", () => {
    for (const sym of TICKER_SYMBOLS) expect(FEED_SYMBOLS).toContain(sym);
  });

  test("curator baskets and holdings resolve to real baskets", () => {
    const symbols = new Set(ALL_BASKETS.map((b) => b.symbol));
    for (const c of CURATORS) {
      for (const sym of c.curates) expect(symbols).toContain(sym);
      for (const [sym] of c.holdings) expect(symbols).toContain(sym);
    }
  });
});

// The launch policy from research/component-liquidity.md, applied only to the
// baskets we curate ourselves: the preview baskets below them deliberately show
// tier C names at tail weights, which is a different (and looser) rule.
describe("house baskets obey the launch policy", () => {
  test("there are exactly three, and they lead the catalog", () => {
    expect(HOUSE_BASKETS.map((b) => b.symbol)).toEqual([
      "bMAG7",
      "bFRNT",
      "bCORE",
    ]);
    // BASKET_DEFS is the home-page lattice, so the house lineup must be the
    // first three entries of ALL_BASKETS, not merely present somewhere in it.
    expect(BASKET_DEFS.map((b) => b.symbol)).toEqual([
      "bMAG7",
      "bFRNT",
      "bCORE",
    ]);
  });

  test("every component is on the tier A/B allowlist", () => {
    for (const basket of HOUSE_BASKETS) {
      for (const sym of Object.keys(basket.recipe)) {
        expect(COMPONENT_FLOAT_USD[sym]).toBeGreaterThan(0);
      }
    }
  });

  // A weight above 0.15 x float / TVL means the basket would have to own more
  // than 15% of the token's entire onchain supply to reach its target size.
  test("no weight exceeds what the component's float can absorb", () => {
    for (const basket of HOUSE_BASKETS) {
      for (const [sym, w] of snapshotWeights(basket.recipe)) {
        expect(w).toBeLessThanOrEqual(maxWeight(sym));
      }
    }
  });

  test("a share is worth about $100 at the prices they were sized against", () => {
    for (const basket of HOUSE_BASKETS) {
      const nav = Object.entries(basket.recipe).reduce(
        (acc, [sym, units]) => acc + units * SNAPSHOT_PRICE_USD[sym],
        0,
      );
      expect(nav).toBeGreaterThan(99.5);
      expect(nav).toBeLessThan(100.5);
    }
  });

  test("Equal Seven is actually equal-weighted", () => {
    const weights = snapshotWeights(
      ALL_BASKETS.find((b) => b.symbol === "bMAG7")!.recipe,
    );
    expect(weights).toHaveLength(7);
    for (const [, w] of weights) expect(w).toBeCloseTo(1 / 7, 4);
  });

  // The donut wraps, so a repeated colour would put two same-coloured segments
  // side by side at the seam. Equal Seven is the widest recipe we ship.
  test("the widest recipe gets a distinct colour per segment", () => {
    const view = basketView(
      ALL_BASKETS.find((b) => b.symbol === "bMAG7")!,
      pricedAll(),
    );
    const colors = (view?.comp ?? []).map((s) => s.color);
    expect(colors).toHaveLength(7);
    expect(new Set(colors).size).toBe(7);
  });

  // The thesis of bFRNT is the position size, so the size is a test, not prose.
  test("the frontier position is capped at 30% and is the largest leg", () => {
    const weights = snapshotWeights(
      ALL_BASKETS.find((b) => b.symbol === "bFRNT")!.recipe,
    );
    const spcx = weights.find(([sym]) => sym === "SPCX")?.[1] as number;
    expect(spcx).toBeCloseTo(0.3, 3);
    for (const [sym, w] of weights)
      if (sym !== "SPCX") expect(w).toBeLessThan(spcx);
  });

  // research/category-precedents.md §9 says SPCX volume decayed ~98% in a month
  // once the IPO event passed. That is a *volume* fact, and it does not move
  // this ceiling: maxWeight is bounded by float, which is supply x price, and
  // supply does not evaporate when trading thins. Nor does thin volume threaten
  // redemption, which is in-kind — a redeemer receives SPCX tokens and never
  // touches the market. Decayed volume shows up in one place only, zap
  // slippage, and that is bounded per-fill by the router rather than by a
  // recipe. So the margin taken here is deliberate headroom, not a derived
  // number: the frontier leg gets at most half of what its float would permit,
  // which is exactly the claim its thesis makes to the reader.
  test("the frontier position takes at most half its float-derived ceiling", () => {
    const weights = snapshotWeights(
      ALL_BASKETS.find((b) => b.symbol === "bFRNT")!.recipe,
    );
    const spcx = weights.find(([sym]) => sym === "SPCX")?.[1] as number;
    expect(spcx).toBeLessThanOrEqual(maxWeight("SPCX") / 2);
  });
});

describe("basketView refuses to invent a NAV", () => {
  test("returns null when a component has no price at all", () => {
    const def = BASKET_DEFS[0];
    const hist = pricedAll();
    delete hist[Object.keys(def.recipe)[0]];
    expect(basketView(def, hist)).toBeNull();
  });

  test("returns null when a component's series is empty", () => {
    const def = BASKET_DEFS[0];
    const hist = pricedAll();
    hist[Object.keys(def.recipe)[0]] = [];
    expect(basketView(def, hist)).toBeNull();
  });

  test("returns null for an empty history", () => {
    expect(basketView(BASKET_DEFS[0], history({}))).toBeNull();
  });
});

describe("basketView maths", () => {
  test("values a recipe at the latest price of each component", () => {
    const def = {
      symbol: "bT",
      name: "T",
      curator: "c",
      recipe: { AAA: 2, BBB: 3 },
    };
    const view = basketView(def, history({ AAA: [10, 20], BBB: [1, 5] }));
    expect(view?.navRaw).toBeCloseTo(2 * 20 + 3 * 5, 10); // 55
    expect(view?.nav).toBe("$55.00");
  });

  test("aligns series of different lengths on their shortest common tail", () => {
    // BBB only has two points, so only the last two AAA points may be used.
    const def = {
      symbol: "bT",
      name: "T",
      curator: "c",
      recipe: { AAA: 1, BBB: 1 },
    };
    const view = basketView(def, history({ AAA: [1, 2, 3, 4], BBB: [10, 20] }));
    expect(view?.navRaw).toBeCloseTo(4 + 20, 10);
    // first aligned point is 3 + 10 = 13, last is 24
    expect(view?.navLow).toBeCloseTo(13, 10);
    expect(view?.navHigh).toBeCloseTo(24, 10);
  });

  test("reports an unknown change rather than zero for a single-point window", () => {
    const def = {
      symbol: "bT",
      name: "T",
      curator: "c",
      recipe: { AAA: 1 },
    };
    const view = basketView(def, history({ AAA: [42] }));
    expect(view?.navRaw).toBe(42);
    expect(view?.chg).toBeNull();
    expect(view?.up).toBeNull();
  });

  test("composition weights sum to ~100 and the end dot sits on the path", () => {
    const view = basketView(BASKET_DEFS[0], pricedAll());
    expect(view).not.toBeNull();
    const total = (view?.comp ?? []).reduce((acc, seg) => acc + seg.w, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
    expect(view?.nav).toMatch(/^\$[\d,]+\.\d{2}$/);
    // the end dot must sit on the sparkline path (same 240x56 viewbox)
    const lastY = view?.spark.split(" ").at(-1)?.split(",")[1];
    expect(view?.sparkEndY).toBe(lastY as string);
  });
});

describe("formatting helpers", () => {
  test("sparkPath emits an SVG path across the viewbox", () => {
    const path = sparkPath([1, 2, 3, 2], 240, 56);
    expect(path.startsWith("M0.0,")).toBe(true);
    expect(path.split(" ")).toHaveLength(4);
  });

  test("sparkPath survives degenerate series instead of emitting NaN", () => {
    expect(sparkPath([], 240, 56)).toBe("");
    expect(sparkPath([5], 240, 56)).toBe("M0,28.0 L240,28.0");
  });

  test("fmtUsd formats with two decimals and separators", () => {
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
  });
});
