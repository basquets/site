import type { TokenOption } from "./TokenSelect";
import { tokenChange, useTokenMarket } from "./use-live-market";

/** The right column before a buy token is picked: the day's biggest movers,
 *  each row a shortcut that sets the buy side. Real market-store data only. */
export default function MarketMovers({
  options,
  excludeAddress,
  onPick,
}: {
  options: TokenOption[];
  excludeAddress: string | null;
  onPick: (o: TokenOption) => void;
}) {
  const market = useTokenMarket();

  const rows = options
    .filter(
      (o) =>
        o.symbol !== "USDG" &&
        o.disabledReason === null &&
        o.address.toLowerCase() !== excludeAddress?.toLowerCase(),
    )
    .map((o) => ({
      option: o,
      price: market.hist[o.symbol]?.at(-1) ?? null,
      change: tokenChange(market, o.symbol),
    }))
    .filter((r) => r.price !== null && r.change !== null)
    // pick the day's biggest absolute moves, then show gainers-first
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    .slice(0, 5)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0));

  if (!rows.length) return null;

  return (
    <div className="flex h-full flex-col border-2 border-ink bg-ground">
      <div className="flex items-baseline justify-between border-b-2 border-divider px-5 py-2.5">
        <span className="text-[11px] uppercase tracking-[0.1em] text-ink/55">
          Movers today
        </span>
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-ink/55">
          <span className="size-2 bg-accent animate-pulse-live" />
          Live
        </span>
      </div>
      <ul className="m-0 flex flex-1 list-none flex-col p-0">
        {rows.map(({ option, price, change }) => (
          <li
            key={option.address}
            className="flex flex-1 border-b-2 border-divider last:border-b-0"
          >
            <button
              type="button"
              onClick={() => onPick(option)}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface active:translate-y-px"
            >
              <span className="font-heading font-extrabold">
                {option.symbol}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink/55">
                {/* registry names carry a "• Robinhood Token" suffix; the list reads cleaner without it */}
                {option.name.split("•")[0].trim()}
              </span>
              <span className="text-[13px] tnum">
                $
                {(price ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`w-16 text-right text-[13px] tnum ${(change ?? 0) >= 0 ? "text-gain" : "text-loss"}`}
              >
                {(change ?? 0) >= 0 ? "+" : ""}
                {((change ?? 0) * 100).toFixed(2)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 border-t-2 border-dashed border-divider px-5 py-2.5 text-[12px] leading-5 text-ink/60">
        Pick one to quote it, or{" "}
        <a href="/stocks" className="text-accent-700">
          browse every stock
        </a>
        .
      </p>
    </div>
  );
}
