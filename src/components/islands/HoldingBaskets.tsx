import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ALL_BASKETS, basketView } from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import { cn } from "@/lib/utils";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

export default function HoldingBaskets({ sym }: { sym: string }) {
  const { hist, mode } = useTokenMarket();
  const holding = ALL_BASKETS.filter((b) => b.recipe[sym]);
  if (holding.length === 0) {
    return (
      <p className="m-0 max-w-[52ch] text-[15.5px] leading-7 text-ink/78">
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
    return <AwaitingMarket mode={mode} subject="Basket NAVs" />;

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
            className="flex flex-col gap-2.5 border border-divider p-5.5 hover:bg-surface"
          >
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
                {b.symbol}
              </span>
              <Badge variant="neutral">{b.curator}</Badge>
            </div>
            <h3 className="m-0 text-xl tracking-[-0.01em]">{b.name}</h3>
            <div className="flex items-baseline gap-2.5">
              <span className="font-heading font-extrabold text-[26px] tnum">
                {view.nav}
              </span>
              <span
                className={`text-[13px] tnum ${view.up == null ? "text-ink/55" : view.up ? "text-gain" : "text-loss"}`}
              >
                {view.chg ?? "—"}
              </span>
            </div>
            <div className="flex h-2 gap-0.5">
              <div className="bg-accent" style={{ width: `${weight}%` }} />
              <div className="flex-1 bg-neutral-300" />
            </div>
            <span className="text-[12px] text-ink/70 tnum">
              {sym} is {weight}% of this recipe · holding fee{" "}
              {STREAMING_FEE_LABEL}
            </span>
            <a
              href={`/baskets/${b.symbol.toLowerCase()}`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
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
