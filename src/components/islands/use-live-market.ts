import {
  type ApiMarket,
  type ApiToken,
  BasquetsApi,
  type PriceTick,
  subscribeTicks,
} from "@basquets/api-client";
import { useSyncExternalStore } from "react";
import type { History } from "@/lib/market";

const MAX_POINTS = 48;

export interface TokenMarket {
  /** loading = first fetch in flight; unavailable = the API could not be reached. */
  mode: "loading" | "live" | "unavailable";
  hist: History; // only symbols the API actually priced
  /**
   * Live only: implied price 24h ago per symbol. A symbol is absent until the API
   * has a candle old enough to compare against — its change is unknown, not zero.
   */
  base24h: Record<string, number>;
  /** Live only: the full API row per symbol, carrying supply, holders and pool depth. */
  tokens: Record<string, ApiToken>;
  /** Live only: market-wide totals, computed server-side from these same rows. */
  totals: ApiMarket | null;
}

export function marketFromTokens(
  tokens: ApiToken[],
  totals: ApiMarket | null = null,
): TokenMarket {
  const hist: History = {};
  const base24h: Record<string, number> = {};
  const bySymbol: Record<string, ApiToken> = {};
  for (const t of tokens) {
    bySymbol[t.symbol] = t;
    if (!t.price) continue;
    hist[t.symbol] = t.spark.length
      ? t.spark.slice(-MAX_POINTS)
      : [t.price.value];
    // The sparkline spans at most 4h, so its first point is not a 24h reference;
    // leaving the base unset keeps the change honest instead of showing +0.00%.
    if (t.price.change24h !== null) {
      base24h[t.symbol] = t.price.value / (1 + t.price.change24h);
    }
  }
  return { mode: "live", hist, base24h, tokens: bySymbol, totals };
}

export function applyTick(m: TokenMarket, tick: PriceTick): TokenMarket {
  const arr = m.hist[tick.symbol];
  if (!arr) return m; // never invent history for tokens the snapshot didn't price
  return {
    ...m,
    hist: { ...m.hist, [tick.symbol]: [...arr, tick.value].slice(-MAX_POINTS) },
  };
}

/**
 * Fractional change against the 24h base. Null means unknown — the API has no
 * candle old enough yet — which is never rendered as 0.00%.
 */
export function tokenChange(m: TokenMarket, sym: string): number | null {
  const arr = m.hist[sym];
  if (!arr?.length) return null;
  const base = m.base24h[sym];
  return base ? arr[arr.length - 1] / base - 1 : null;
}

// --- store: empty until the API answers; never invents a price ---

const EMPTY: TokenMarket = {
  mode: "loading",
  hist: {},
  base24h: {},
  tokens: {},
  totals: null,
};
const UNAVAILABLE: TokenMarket = { ...EMPTY, mode: "unavailable" };

/**
 * Astro compiles each island into its own bundle, so a module-level `let` gives
 * every island a *separate* copy of this store: one fetch and one SSE connection
 * each, and islands that disagree about the same token because their snapshots
 * arrived at different moments. Anchoring the store on `globalThis` makes the
 * page share exactly one.
 */
interface MarketStore {
  state: TokenMarket;
  subs: Set<() => void>;
  started: boolean;
}
const STORE_KEY = "__basquetsMarketStore";
const globalScope = globalThis as typeof globalThis & {
  [STORE_KEY]?: MarketStore;
};
// biome-ignore lint/suspicious/noAssignInExpressions: one-shot global singleton — assign-and-read is the point
const store: MarketStore = (globalScope[STORE_KEY] ??= {
  state: EMPTY,
  subs: new Set(),
  started: false,
});

function notify() {
  for (const fn of store.subs) fn();
}

function fail(reason: unknown) {
  // No fallback data: an unreachable API means the UI says so rather than
  // showing numbers nobody can verify.
  console.warn("[market] live data unavailable:", reason);
  store.state = UNAVAILABLE;
  notify();
}

function start() {
  if (store.started) return;
  store.started = true;
  const baseUrl = import.meta.env.PUBLIC_API_URL as string | undefined;
  if (!baseUrl) {
    fail("PUBLIC_API_URL is not set");
    return;
  }
  const api = new BasquetsApi(baseUrl);
  // Totals are computed server-side from the same rows, so the header and the
  // table can never disagree; a failure there must not cost us the table.
  Promise.all([api.tokens(), api.market().catch(() => null)])
    .then(([tokens, totals]) => {
      store.state = marketFromTokens(tokens, totals);
      notify();
      subscribeTicks(baseUrl, (tick) => {
        store.state = applyTick(store.state, tick);
        notify();
      });
    })
    .catch(fail);
}

function subscribe(cb: () => void) {
  store.subs.add(cb);
  start();
  return () => store.subs.delete(cb);
}

export function useTokenMarket(): TokenMarket {
  return useSyncExternalStore(
    subscribe,
    () => store.state,
    () => EMPTY,
  );
}
