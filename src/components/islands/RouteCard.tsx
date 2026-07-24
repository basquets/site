import type { ApiQuote } from "@basquets/api-client";
import { formatUnits } from "viem";
import { laneByRail, railLabel } from "@/lib/lanes";
import { cn } from "@/lib/utils";

/** Side-by-side rail comparison; the winner is executed. */
export default function RouteCard({ quote }: { quote: ApiQuote }) {
  return (
    <div className="border-2 border-ink bg-ground">
      <p className="m-0 border-b-2 border-divider px-5 py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink/55">
        Best route
      </p>
      <ul className="m-0 list-none p-0">
        {[...quote.rails]
          .sort((a, b) => {
            const av = BigInt(a.buyAmount);
            const bv = BigInt(b.buyAmount);
            return bv > av ? 1 : bv < av ? -1 : 0;
          })
          .map((r) => {
            const isBest = r.rail === quote.best;
            return (
              <li
                key={r.rail}
                className={`flex items-baseline justify-between gap-3 px-5 py-2.5 text-[13px] ${isBest ? "bg-accent-100" : "opacity-55"}`}
              >
                <span className={cn("flex items-center gap-2", isBest ? "font-heading font-extrabold" : "")}>
                  {laneByRail(r.rail)?.logo && <img src={laneByRail(r.rail)!.logo} alt="" width={18} height={18} className="rounded-[4px]" />}
                  {railLabel(r.rail, r.hops?.length ?? null)}
                </span>
                <span className="tnum">
                  {Number(
                    formatUnits(BigInt(r.buyAmount), quote.buy.decimals),
                  ).toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
                  {quote.buy.symbol}
                  {isBest ? " ✓" : ""}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
