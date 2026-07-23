import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ALL_BASKETS, basketView } from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import { cn } from "@/lib/utils";
import AwaitingMarket, { marketMessage } from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

/** The baskets whose recipes include `sym`. `onInk` restyles the cards for the
 *  dark slab the stock page closes on. */
export default function HoldingBaskets({
  sym,
  onInk = false,
}: {
  sym: string;
  onInk?: boolean;
}) {
  const { hist, mode } = useTokenMarket();
  const holding = ALL_BASKETS.filter((b) => b.recipe[sym]);
  if (holding.length === 0) {
    return (
      <p
        className={`m-0 max-w-[52ch] text-[15.5px] leading-7 ${onInk ? "text-ground/70" : "text-ink/78"}`}
      >
        No published basket holds {sym} yet. Someone gets to be first. Recipes
        with a distinct point of view are the ones people remember.
      </p>
    );
  }
  const priced = holding
    .map((b) => ({ b, view: basketView(b, hist) }))
    .filter(
      (
        x,
      ): x is {
        b: (typeof holding)[number];
        view: NonNullable<typeof x.view>;
      } => x.view !== null,
    );
  if (!priced.length)
    return onInk ? (
      <p className="m-0 py-8 text-[13px] text-ground/60" aria-live="polite">
        {marketMessage(mode, "Basket NAVs")}
      </p>
    ) : (
      <AwaitingMarket mode={mode} subject="Basket NAVs" />
    );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-7">
      {priced.map(({ b, view }) => {
        const weight = (
          ((hist[sym]?.at(-1) ?? 0) * b.recipe[sym] * 100) /
          view.navRaw
        ).toFixed(1);
        return (
          <div
            key={b.symbol}
            className={
              onInk
                ? "flex flex-col gap-2.5 border-2 border-ground/25 p-5.5 hover:bg-ground/8"
                : "flex flex-col gap-2.5 border border-divider p-5.5 hover:bg-surface"
            }
          >
            <div className="flex items-baseline justify-between gap-2.5">
              <span
                className={`text-[11px] uppercase tracking-[0.1em] ${onInk ? "text-accent-300" : "text-accent-700"}`}
              >
                {b.symbol}
              </span>
              {onInk ? (
                <span className="border border-ground/30 px-2.5 py-0.5 text-[11px] tracking-[0.02em] text-ground/70">
                  {b.curator}
                </span>
              ) : (
                <Badge variant="neutral">{b.curator}</Badge>
              )}
            </div>
            <h3
              className={`m-0 text-xl tracking-[-0.01em] ${onInk ? "text-ground" : ""}`}
            >
              {b.name}
            </h3>
            <div className="flex items-baseline gap-2.5">
              <span
                className={`font-heading font-extrabold text-[26px] tnum ${onInk ? "text-ground" : ""}`}
              >
                {view.nav}
              </span>
              <span
                className={`text-[13px] tnum ${
                  view.up == null
                    ? onInk
                      ? "text-ground/55"
                      : "text-ink/55"
                    : view.up
                      ? onInk
                        ? "text-accent-300"
                        : "text-gain"
                      : onInk
                        ? "text-red-300"
                        : "text-loss"
                }`}
              >
                {view.chg ?? "—"}
              </span>
            </div>
            <div className="flex h-2 gap-0.5">
              <div
                className={onInk ? "bg-accent-300" : "bg-accent"}
                style={{ width: `${weight}%` }}
              />
              <div
                className={`flex-1 ${onInk ? "bg-ground/20" : "bg-neutral-300"}`}
              />
            </div>
            <span
              className={`text-[12px] tnum ${onInk ? "text-ground/60" : "text-ink/70"}`}
            >
              {sym} is {weight}% of this recipe · holding fee{" "}
              {STREAMING_FEE_LABEL}
            </span>
            <a
              href={`/baskets/${b.symbol.toLowerCase()}`}
              className={cn(
                buttonVariants({ variant: onInk ? "inverse" : "secondary" }),
                "mt-1.5 self-start",
              )}
            >
              View {b.symbol}
            </a>
          </div>
        );
      })}
    </div>
  );
}
