import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { basketView, FLAGSHIP, fmtUsd } from "@/lib/market";
import { cn } from "@/lib/utils";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";
import { useCountUp } from "./use-reveal";

// The protocol's launch rates: 0.25% zap fee on the USDG leg, then the 0.40%
// mint fee carved from the minted amount (see /docs/fees).
const ZAP_FEE = 0.0025;
const MINT_FEE = 0.004;

/** The core product action as a live band: $100 in, recipe executes, basket out.
 *  Stages reveal in sequence when the card first scrolls into view, so it
 *  narrates the zap rather than just listing it. */
export default function ZapCard() {
  const { hist, mode } = useTokenMarket();
  const def = FLAGSHIP;
  const view = basketView(def, hist);
  // Hooks run on every render, so both of these are set up before the unpriced
  // early return below.
  const priced = view !== null;
  // The card sits in the hero, so it is on screen the moment it can render:
  // the reveal starts as soon as real numbers exist, no scroll trigger needed.
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (priced) setPlayed(true);
  }, [priced]);
  const minted = view ? (100 * (1 - ZAP_FEE)) / view.navRaw : 0;
  const counted = useCountUp(minted * (1 - MINT_FEE), played);

  if (!view) {
    return (
      <div className="border-2 border-ink bg-ground px-6">
        <AwaitingMarket mode={mode} subject="Zap preview" />
      </div>
    );
  }
  const legs = Object.entries(def.recipe).map(([sym, units]) => ({
    sym,
    qty: (units * minted).toFixed(4),
    price: fmtUsd(hist[sym]?.at(-1) ?? 0),
  }));

  const label = "m-0 text-[11px] uppercase tracking-[0.1em] text-ink/55";
  /** Holds a stage hidden until the reveal reaches it, then rises it into place. */
  const stage = (delay: number, base: string) =>
    played
      ? {
          className: cn(base, "animate-zap-in"),
          style: { animationDelay: `${delay}ms` },
        }
      : { className: base, style: { opacity: 0 } };
  // Chevron rather than a text arrow: it sits on the optical centre without the
  // baseline drift a glyph gets inside a stretched grid row.
  const arrow = (delay: number) => (
    <span className="hidden items-center px-1 text-accent-700 lg:flex">
      <svg
        viewBox="0 0 24 24"
        className={cn("size-5", played && "animate-arrow-pulse")}
        style={played ? { animationDelay: `${delay}ms` } : { opacity: 0 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </span>
  );

  return (
    <div className="border-2 border-ink bg-ground">
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-divider px-6 py-3">
        <span className="text-[11px] uppercase tracking-[0.1em] text-ink/55">
          How a zap works
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
          Live · {def.name}
        </span>
      </div>
      <div className="grid items-stretch lg:grid-cols-[minmax(0,4fr)_auto_minmax(0,6fr)_auto_minmax(0,4fr)]">
        <div
          {...stage(60, "border-b-2 border-divider px-6 py-5 lg:border-b-0")}
        >
          <p className={label}>You send</p>
          <p className="mt-2 mb-0 font-heading font-extrabold text-[30px] tnum">
            $100.00
          </p>
          <p className="mt-1.5 mb-0 text-[13px] leading-6 text-ink/70">
            USDG from your wallet. One signature. No gas.
          </p>
        </div>
        {arrow(1000)}
        <div
          {...stage(260, "border-b-2 border-divider px-6 py-5 lg:border-b-0")}
        >
          <p className={label}>The recipe executes at oracle prices</p>
          <div className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] tnum sm:grid-cols-2">
            {legs.map((leg, i) => (
              <div
                key={leg.sym}
                {...stage(320 + i * 45, "flex justify-between gap-4")}
              >
                <span className="font-heading font-extrabold">{leg.sym}</span>
                <span className="whitespace-nowrap text-ink/70">
                  {leg.qty} @ {leg.price}
                </span>
              </div>
            ))}
          </div>
        </div>
        {arrow(1120)}
        <div
          {...stage(
            700,
            "flex flex-col justify-center bg-accent-100 px-6 py-5",
          )}
        >
          <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-accent-700">
            You hold
          </p>
          <p className="mt-2 mb-0 font-heading font-extrabold text-[30px] tnum">
            {counted.toFixed(4)} {def.symbol}
          </p>
          <Button asChild size="block" className="mt-4">
            <a href={`/baskets/${def.symbol.toLowerCase()}`}>
              Invest in {def.symbol}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
