import { Badge } from "@/components/ui/badge";
import { BASKET_BY_SYMBOL, basketView } from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { CompositionBar, Spark } from "./BasketSpark";
import { useTokenMarket } from "./use-live-market";

/** Reusable live basket card linking to its detail page. */
export default function BasketCard({ symbol }: { symbol: string }) {
  const { hist, mode } = useTokenMarket();
  const def = BASKET_BY_SYMBOL[symbol];
  const view = basketView(def, hist);
  if (!view) {
    return (
      <div className="flex flex-col gap-2.5 border-2 border-divider bg-ground p-6">
        <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
          {def.symbol}
        </span>
        <h3 className="m-0 text-2xl tracking-[-0.01em]">{def.name}</h3>
        <AwaitingMarket mode={mode} subject="NAV" />
      </div>
    );
  }
  return (
    <a
      href={`/baskets/${symbol.toLowerCase()}`}
      className="flex flex-col gap-2.5 border-2 border-divider bg-ground p-6 text-ink no-underline hover:bg-surface"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
          {view.symbol}
        </span>
        <Badge variant="neutral">{view.curator}</Badge>
      </span>
      <h3 className="m-0 text-2xl tracking-[-0.01em]">{view.name}</h3>
      <span className="flex items-baseline gap-3">
        <span className="font-heading font-extrabold text-[32px] tnum">
          {view.nav}
        </span>
        <span
          className={`text-[13px] tnum ${view.up == null ? "text-ink/55" : view.up ? "text-gain" : "text-loss"}`}
        >
          {view.chg ?? "—"}
        </span>
      </span>
      <Spark view={view} height={56} />
      <CompositionBar view={view} height={8} />
      <span className="flex justify-between gap-3 text-[11px] text-ink/55 tnum">
        <span>{view.compLabel}</span>
        <span>{def.holders} holders</span>
        <span>holding fee {STREAMING_FEE_LABEL}</span>
      </span>
    </a>
  );
}
