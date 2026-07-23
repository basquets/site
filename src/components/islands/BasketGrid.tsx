import { Badge } from "@/components/ui/badge";
import { ALL_BASKETS, BASKET_BY_SYMBOL, basketView } from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { CompositionBar, Spark } from "./BasketSpark";
import { useTokenMarket } from "./use-live-market";

/**
 * A ruled lattice of live basket cards — the catalog surface.
 *
 * Every cell shares its neighbours' borders rather than drawing its own box,
 * which is why this is not a grid of `BasketCard`: that component is a
 * standalone bordered card for placing on its own, and tiling it would double
 * every internal rule.
 */
export default function BasketGrid({
  symbols,
  minCol = 340,
}: {
  /** Which baskets to show, in order. Defaults to the whole catalog. */
  symbols?: string[];
  /** Minimum column width in px before the grid wraps to fewer columns. */
  minCol?: number;
}) {
  const { hist, mode } = useTokenMarket();
  const defs = symbols
    ? symbols.map((s) => BASKET_BY_SYMBOL[s]).filter(Boolean)
    : ALL_BASKETS;
  const views = defs
    .map((d) => basketView(d, hist))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // A partial grid would silently drop whichever baskets we could not price, so
  // an incomplete catalog reads as a complete one. Show the state instead.
  if (views.length < defs.length)
    return <AwaitingMarket mode={mode} subject="Basket NAVs" />;

  return (
    <div
      className="grid border-t-2 border-l-2 border-divider"
      style={{
        gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${minCol}px),1fr))`,
      }}
    >
      {views.map((v) => (
        <div
          key={v.symbol}
          className="relative flex flex-col gap-2.5 border-r-2 border-b-2 border-divider p-7 hover:bg-surface"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
              {v.symbol}
            </span>
            <Badge variant="neutral">{v.curator}</Badge>
          </div>
          <h3 className="m-0 text-[22px] tracking-[-0.015em]">
            <a
              href={`/baskets/${v.symbol.toLowerCase()}`}
              className="text-ink no-underline after:absolute after:inset-0"
            >
              {v.name}
            </a>
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="font-heading font-extrabold text-[30px] tracking-[-0.01em] tnum">
              {v.nav}
            </span>
            <span
              className={`text-[13px] tnum ${v.up == null ? "text-ink/55" : v.up ? "text-gain" : "text-loss"}`}
            >
              {v.chg ?? "—"}
            </span>
          </div>
          <div className="my-1">
            <Spark view={v} height={52} />
          </div>
          <CompositionBar view={v} height={8} />
          <div className="flex flex-wrap justify-between gap-x-3 text-[11px] text-ink/55 tnum">
            <span>{v.compLabel}</span>
            <span>holding fee {STREAMING_FEE_LABEL}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
