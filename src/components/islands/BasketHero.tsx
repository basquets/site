import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BASKET_BY_SYMBOL, basketView, fmtUsd } from "@/lib/market";
import { cn } from "@/lib/utils";
import AwaitingMarket from "./AwaitingMarket";
import { CompositionBar, Spark } from "./BasketSpark";
import { useTokenMarket } from "./use-live-market";

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={share}
      className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
    >
      {copied ? "Link copied" : "Share basket"}
    </button>
  );
}

export default function BasketHero({ symbol }: { symbol: string }) {
  const { hist, mode } = useTokenMarket();
  const def = BASKET_BY_SYMBOL[symbol];
  const view = basketView(def, hist);
  if (!view) {
    return (
      <div className="mt-10">
        <span className="text-[13px] uppercase tracking-[0.1em] text-accent-700">
          {def.symbol}
        </span>
        <h1 className="mt-2.5 mb-0 -ml-[0.058em] text-[clamp(40px,5vw,72px)] leading-[1.06] tracking-[-0.02em]">
          {def.name}
        </h1>
        <p className="mt-3.5 mb-0 max-w-[52ch] text-base leading-7 text-ink/78">
          {def.thesis}
        </p>
        <AwaitingMarket mode={mode} subject="NAV per share" />
      </div>
    );
  }
  // The range label reuses the NAV series basketView already built, so the two
  // can never be computed from different windows.
  const { navLow: low, navHigh: high } = view;

  return (
    <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-end gap-y-10 gap-x-[clamp(32px,5vw,88px)]">
      <div>
        <div className="flex flex-wrap items-baseline gap-3.5">
          <span className="text-[13px] uppercase tracking-[0.1em] text-accent-700">
            {view.symbol}
          </span>
          <Badge variant="neutral">by {view.curator}</Badge>
        </div>
        <h1 className="mt-2.5 mb-0 -ml-[0.058em] text-[clamp(40px,5vw,72px)] leading-[1.06] tracking-[-0.02em]">
          {view.name}
        </h1>
        <p className="mt-3.5 mb-0 max-w-[52ch] text-base leading-7 text-ink/78">
          {def.thesis}
        </p>
        <div className="mt-7 flex items-baseline gap-4">
          <span className="font-heading font-extrabold text-[clamp(40px,4.5vw,64px)] tracking-[-0.01em] tnum">
            {view.nav}
          </span>
          <span
            className={`text-[17px] tnum ${view.up == null ? "text-ink/55" : view.up ? "text-gain" : "text-loss"}`}
          >
            {view.chg ?? "—"}
          </span>
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 text-xs uppercase tracking-[0.08em] text-ink/70">
          <span className="size-2.5 bg-accent animate-pulse-live" />
          <span>NAV per share · priced live by Chainlink</span>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="/connect"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            Invest in {view.symbol}
          </a>
          <ShareButton />
        </div>
      </div>
      <div>
        <Spark view={view} height={180} />
        <div className="mt-3.5">
          <CompositionBar view={view} height={12} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.08em] text-ink/55 tnum">
          <span>{view.compLabel}</span>
          <span>
            {fmtUsd(low)} to {fmtUsd(high)}
          </span>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2">
          {view.comp.map((seg) => (
            <a
              key={seg.sym}
              href={`/stocks/${seg.sym.toLowerCase()}`}
              className="inline-flex items-center gap-2 text-[12.5px] text-ink no-underline tnum hover:text-accent-700"
            >
              <span
                className="size-2.5 flex-none"
                style={{ background: seg.color }}
              />
              <span className="font-heading font-extrabold">{seg.sym}</span>
              <span className="text-ink/60">{seg.w}%</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
