/**
 * Basket editorial data and the maths that turns real oracle prices into a
 * basket view.
 *
 * There are no synthetic prices anywhere in this file, and there must never be:
 * every number a visitor sees comes from `use-live-market`, which reads the API.
 *
 * Nor are there any invented baskets. This file used to carry five illustrative
 * recipes attributed to fictional curators, with holder counts and TVL figures
 * to match; on a catalog page those read as inventory rather than as examples,
 * so they are gone. What remains is only what we intend to deploy.
 */

export type Sym = string;
/**
 * Recent price points per symbol, oldest first — only symbols the API actually
 * priced. The value is deliberately optional: about two thirds of the registry
 * has no price we trust, so every lookup has to face the missing case instead of
 * crashing or quietly reading a stale zero.
 */
export type History = Record<string, number[] | undefined>;

export interface BasketDef {
  symbol: string;
  name: string;
  curator: string;
  /**
   * Units of each component per basket share — the onchain recipe format
   * (`issue()` pulls `units[i] × amount`), not percentage weights. Units do not
   * sum to anything in particular; weight is derived at oracle prices, which is
   * what `basketView` does. See docs/how-baskets-work.mdx.
   */
  recipe: Record<string, number>;
}

/** A demo basket with the editorial metadata the detail pages need. */
export interface BasketInfo extends BasketDef {
  curatorHandle: string;
  thesis: string;
  holders: string;
  tvl: string;
  published: string;
}

/**
 * The registry tokens that have a Chainlink feed on chain 4663, and so are the
 * only ones `ComponentRegistry.addComponent` accepts. 34 of the 96 registry
 * tokens, snapshot 2026-07-21 — see research/component-liquidity.md.
 */
export const FEED_SYMBOLS: readonly Sym[] = [
  "AAPL",
  "AMD",
  "AMZN",
  "ASML",
  "BABA",
  "CLSK",
  "COIN",
  "CRCL",
  "CRWV",
  "EWY",
  "GME",
  "GOOGL",
  "INTC",
  "IONQ",
  "META",
  "MSFT",
  "MSTR",
  "MU",
  "NBIS",
  "NVDA",
  "ORCL",
  "PLTR",
  "QQQ",
  "RGTI",
  "RKLB",
  "SGOV",
  "SLV",
  "SNDK",
  "SPCX",
  "SPY",
  "TSLA",
  "TSM",
  "USAR",
  "USO",
];

/**
 * On-chain float in USD per component, snapshot 2026-07-21 from
 * research/component-liquidity-2026-07-21.json.
 *
 * Only the tier A and B names appear, because those are the launch allowlist:
 * the 24 other feed-backed tokens have too little traded volume to weight until
 * an RFQ quote test clears them. Float is not a price and is never displayed —
 * it exists here so `maxWeight` can be asserted in tests.
 */
export const COMPONENT_FLOAT_USD: Record<string, number> = {
  NVDA: 2_880_965,
  TSLA: 1_136_020,
  SPCX: 1_023_466,
  AAPL: 860_381,
  AMZN: 830_321,
  SNDK: 802_859,
  GOOGL: 775_057,
  MSFT: 690_405,
  SPY: 681_475,
  META: 624_579,
};

/**
 * The TVL the house baskets are sized for — the guarded-launch cap from spec
 * §11 M4. Every weight below is checked against this number, so raising it
 * means re-checking the recipes, not just editing a constant.
 */
export const HOUSE_TARGET_TVL_USD = 250_000;

/**
 * The ceiling float puts on a component's weight, as a fraction of NAV:
 * `0.15 x float / targetTVL` (research/component-liquidity.md). Above it, the
 * basket would need to own more than 15% of everything that exists on chain,
 * which is a sourcing problem long before it is a pricing one — see the SPCX
 * subscriptions xStocks had to cancel and refund.
 *
 * Returns 0 for anything not on the allowlist, so an unlisted symbol fails
 * closed rather than reading as unconstrained.
 */
export function maxWeight(
  sym: Sym,
  targetTvlUsd: number = HOUSE_TARGET_TVL_USD,
): number {
  const float = COMPONENT_FLOAT_USD[sym];
  return float === undefined ? 0 : (0.15 * float) / targetTvlUsd;
}

// The launch lineup — the baskets Basquets curates itself, so the protocol
// ships with something to hold rather than an empty catalog. Three rules bind
// all of them:
//
// 1. Every component has a Chainlink feed on chain 4663. ComponentRegistry
//    requires one and NAVOracle fails closed without it, so the 62 registry
//    tokens with no feed (AVGO, COST, QCOM, UPS, AMAT, LLY, NFLX, ...) can
//    never be components in v1. See research/component-liquidity.md.
// 2. Every component is tier A or B from that same research — the ten names
//    with both real onchain float and real traded volume.
// 3. Every weight sits under `maxWeight` at HOUSE_TARGET_TVL_USD.
//
// Recipe values are units per share, not weights, sized at the 2026-07-21
// snapshot prices in research/component-liquidity-2026-07-21.json — the only
// price vintage committed to the repo, so the arithmetic is reproducible. Units
// are fixed, exactly as an onchain recipe is, so the weights drift with the
// market from here; that drift is the point.
export const ALL_BASKETS: BasketInfo[] = [
  {
    symbol: "bMAG7",
    name: "Equal Seven",
    curator: "@basquets",
    curatorHandle: "basquets",
    recipe: {
      NVDA: 0.06924,
      TSLA: 0.03778,
      MSFT: 0.03586,
      AAPL: 0.04359,
      AMZN: 0.0576,
      GOOGL: 0.04091,
      META: 0.02203,
    },
    thesis:
      "The seven companies everyone already owns, weighted evenly instead of by size. A cap-weighted index makes you buy the most of whatever has already won; this one starts each of the seven at the same place and then lets the market do the sorting.",
    holders: "0",
    tvl: "$0",
    published: "At launch",
  },
  {
    symbol: "bFRNT",
    name: "Frontier and Floor",
    curator: "@basquets",
    curatorHandle: "basquets",
    recipe: { SPCX: 0.24369, TSLA: 0.06611, NVDA: 0.12117, AMZN: 0.08064 },
    thesis:
      "SpaceX is the one thing on this chain people actually came for, and it is also the one thing whose onchain volume fell 98% in a month once the IPO excitement passed. So it is here at 30% — a real position, half of what its float would permit, and small enough that a bad year in it is a bad year, not the end of one. The floor underneath is the three deepest names on the chain.",
    holders: "0",
    tvl: "$0",
    published: "At launch",
  },
  {
    symbol: "bCORE",
    name: "One Good Decision",
    curator: "@basquets",
    curatorHandle: "basquets",
    recipe: { SPY: 0.04685, GOOGL: 0.07159, AAPL: 0.06103, AMZN: 0.08064 },
    thesis:
      "The whole market plus a tilt to the platforms that run it. Buy it weekly, look at it yearly.",
    holders: "0",
    tvl: "$0",
    published: "At launch",
  },
];

export const BASKET_BY_SYMBOL: Record<string, BasketInfo> = Object.fromEntries(
  ALL_BASKETS.map((b) => [b.symbol, b]),
);

/**
 * The one basket the home page leads with.
 *
 * research/category-precedents.md §4: demand concentrates violently on a single
 * recognisable name rather than spreading across a catalog, so a launch lineup
 * should make one basket exceptional instead of three balanced. Equal Seven is
 * that one — the Mag-7 composition is the only demonstrated demand on this chain
 * (StockVault holds exactly it). Frontier and Floor absorbs a larger zap, but
 * fronting the product with a SpaceX-weighted basket ties the home page to the
 * one component we deliberately sized down for being an IPO-event asset (§9).
 */
export const FLAGSHIP_SYMBOL = "bMAG7";
export const FLAGSHIP: BasketInfo = BASKET_BY_SYMBOL[FLAGSHIP_SYMBOL];

/** The baskets shown on the home page lattice. */
export const BASKET_DEFS: BasketInfo[] = ALL_BASKETS;

export interface CuratorProfile {
  handle: string;
  name: string;
  since: string;
  /** Unique holders across their baskets. */
  holders: string;
  bio: string;
  curates: string[];
  /** [basket symbol, shares held, cost factor vs current value] */
  holdings: [string, number, number][];
}

export const CURATORS: CuratorProfile[] = [
  {
    handle: "basquets",
    name: "@basquets",
    since: "2026",
    holders: "0",
    bio: "The protocol's own curator. Three baskets at launch so nobody has to be the first person to deploy one — an equal-weighted seven, one frontier position sized so it cannot dominate, and a single-decision core. Every recipe is bounded by what the components' onchain float can actually absorb, and that arithmetic is published alongside it.",
    curates: ["bMAG7", "bFRNT", "bCORE"],
    holdings: [],
  },
];

export const CURATOR_BY_HANDLE: Record<string, CuratorProfile> =
  Object.fromEntries(CURATORS.map((c) => [c.handle, c]));

// The ten deepest feed-backed names on chain 4663 (tier A and B in
// research/component-liquidity.md) — every one of these can be quoted live.
export const TICKER_SYMBOLS: Sym[] = [
  "NVDA",
  "TSLA",
  "SPCX",
  "MSFT",
  "AAPL",
  "AMZN",
  "GOOGL",
  "SPY",
  "SNDK",
  "META",
];

export function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** SVG path for a sparkline over a w×h viewbox with 4px vertical padding. */
export function sparkPath(arr: number[], w: number, h: number): string {
  if (arr.length === 0) return "";
  if (arr.length === 1)
    return `M0,${(h / 2).toFixed(1)} L${w},${(h / 2).toFixed(1)}`;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return arr
    .map((v, i) => {
      const x = ((i * w) / (arr.length - 1)).toFixed(1);
      const y = (h - 4 - ((v - min) / range) * (h - 8)).toFixed(1);
      return `${i ? "L" : "M"}${x},${y}`;
    })
    .join(" ");
}

// Seven entries because the largest recipe has seven components and the donut
// wraps: with five, the last segment would sit next to the first in the same
// colour.
export const COMP_COLORS = [
  "var(--color-ink)",
  "var(--color-accent)",
  "var(--color-neutral-500)",
  "var(--color-neutral-300)",
  "var(--color-accent-300)",
  "var(--color-accent-700)",
  "var(--color-neutral-700)",
];

export interface BasketViewSeg {
  sym: string;
  w: number;
  color: string;
}

export interface BasketView extends BasketDef {
  nav: string;
  navRaw: number;
  navLow: number;
  navHigh: number;
  /** Null when the priced window is a single point, so no change can be derived. */
  chg: string | null;
  up: boolean | null;
  spark: string;
  sparkEndY: string;
  comp: BasketViewSeg[];
  compLabel: string;
}

/**
 * Values a recipe at live oracle prices.
 *
 * Returns null unless every component has a real price: a basket NAV missing one
 * of its legs is not a smaller NAV, it is an unknown one, and showing a partial
 * sum would be the same fabrication as a simulated price.
 *
 * Series can differ in length (a token priced without candle history contributes
 * a single point), so they are aligned on their shortest common tail.
 */
export function navSeries(def: BasketDef, hist: History): number[] {
  const syms = Object.keys(def.recipe) as Sym[];
  const maybe = syms.map((s) => hist[s]);
  if (maybe.some((a) => !a || a.length === 0)) return [];
  const series = maybe as number[][];

  const n = Math.min(...series.map((a) => a.length));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let j = 0; j < syms.length; j++) {
      const a = series[j];
      v += a[a.length - n + i] * (def.recipe[syms[j]] as number);
    }
    out.push(v);
  }
  return out;
}

export function basketView(def: BasketDef, hist: History): BasketView | null {
  const syms = Object.keys(def.recipe) as Sym[];
  const navHist = navSeries(def, hist);
  if (!navHist.length) return null;
  const n = navHist.length;
  const series = syms.map((s) => hist[s] as number[]);

  const nav = navHist[n - 1];
  if (!Number.isFinite(nav) || nav <= 0) return null;
  const chgPct = n > 1 ? (nav / navHist[0] - 1) * 100 : null;
  const up = chgPct === null ? null : chgPct >= 0;

  const comp = syms.map((s, i) => {
    const a = series[i];
    return {
      sym: s,
      w: +(((a[a.length - 1] * (def.recipe[s] as number)) / nav) * 100).toFixed(
        1,
      ),
      color: COMP_COLORS[i % COMP_COLORS.length],
    };
  });

  const min = Math.min(...navHist);
  const max = Math.max(...navHist);
  const range = max - min || 1;
  // The SVG viewBox is 240x56; the path and the end-dot y must use the same height.
  const endY = 56 - 4 - ((nav - min) / range) * (56 - 8);
  return {
    ...def,
    nav: fmtUsd(nav),
    navRaw: nav,
    navLow: min,
    navHigh: max,
    chg: chgPct === null ? null : `${up ? "▲ +" : "▼ "}${chgPct.toFixed(2)}%`,
    up,
    spark: sparkPath(navHist, 240, 56),
    sparkEndY: endY.toFixed(1),
    comp,
    compLabel: `${syms.length} stock tokens`,
  };
}
