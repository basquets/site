import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BASKET_DEFS, basketView } from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { CompositionBar, Spark } from "./BasketSpark";
import { useTokenMarket } from "./use-live-market";

export default function BasketLattice() {
  const { hist, mode } = useTokenMarket();
  const views = BASKET_DEFS.map((d) => basketView(d, hist)).filter(
    (v): v is NonNullable<typeof v> => v !== null,
  );
  if (!views.length)
    return <AwaitingMarket mode={mode} subject="Basket NAVs" />;
  const [featured, ...rest] = views;
  return (
    <div className="grid grid-flow-dense grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] border-t-2 border-l-2 border-divider">
      <div className="relative row-span-2 flex flex-col gap-3 border-r-2 border-b-2 border-divider p-7 hover:bg-surface">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
            {featured.symbol} · Featured
          </span>
          <Badge variant="neutral">{featured.curator}</Badge>
        </div>
        <h3 className="m-0 text-[clamp(24px,2.4vw,32px)] tracking-[-0.015em]">
          <a
            href={`/baskets/${featured.symbol.toLowerCase()}`}
            className="text-ink no-underline after:absolute after:inset-0"
          >
            {featured.name}
          </a>
        </h3>
        <div className="flex items-baseline gap-3.5">
          <span className="font-heading font-extrabold text-[clamp(38px,3.6vw,54px)] tracking-[-0.01em] tnum">
            {featured.nav}
          </span>
          <span
            className={`text-[15px] tnum ${featured.up == null ? "text-ink/55" : featured.up ? "text-gain" : "text-loss"}`}
          >
            {featured.chg ?? "—"}
          </span>
        </div>
        <div className="my-2">
          <Spark view={featured} height={96} />
        </div>
        <CompositionBar view={featured} />
        <div className="flex justify-between text-[11px] text-ink/55">
          <span>{featured.compLabel}</span>
          <span className="tnum">holding fee {STREAMING_FEE_LABEL}</span>
        </div>
        <Button asChild className="relative z-10 mt-2 self-start">
          <a href="/connect">Invest in {featured.symbol}</a>
        </Button>
      </div>
      {rest.map((b) => (
        <div
          key={b.symbol}
          className="relative grid grid-cols-[minmax(0,1fr)_minmax(120px,180px)] items-center gap-x-6 gap-y-2 border-r-2 border-b-2 border-divider px-7 py-5.5 hover:bg-surface"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
              {b.symbol} · {b.curator}
            </span>
            <h3 className="m-0 text-xl tracking-[-0.01em]">
              <a
                href={`/baskets/${b.symbol.toLowerCase()}`}
                className="text-ink no-underline after:absolute after:inset-0"
              >
                {b.name}
              </a>
            </h3>
            <div className="flex items-baseline gap-2.5">
              <span className="font-heading font-extrabold text-[26px] tnum">
                {b.nav}
              </span>
              <span
                className={`text-[13px] tnum ${b.up == null ? "text-ink/55" : b.up ? "text-gain" : "text-loss"}`}
              >
                {b.chg ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Spark view={b} height={40} />
            <CompositionBar view={b} height={8} />
            <span className="text-[11px] text-ink/55 tnum">
              {b.compLabel} · holding fee {STREAMING_FEE_LABEL}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
