import type { ApiQuote } from "@basquets/api-client";
import { formatUnits } from "viem";

const railLabel = (rail: string, hops: number | null) =>
  rail === "zeroex"
    ? "0x RFQ (market maker)"
    : `Uniswap v4${hops === 2 ? " · via USDG" : ""}`;

/** Side-by-side rail comparison; the winner is executed. */
export default function RouteCard({ quote }: { quote: ApiQuote }) {
  return (
    <div className="border-2 border-ink bg-ground">
      <p className="m-0 border-b-2 border-divider px-5 py-2.5 text-[11px] uppercase tracking-[0.1em] text-ink/55">
        Best route
      </p>
      <ul className="m-0 list-none p-0">
        {[...quote.rails]
          .sort((a, b) => (BigInt(b.buyAmount) > BigInt(a.buyAmount) ? 1 : -1))
          .map((r) => {
            const isBest = r.rail === quote.best;
            return (
              <li
                key={r.rail}
                className={`flex items-baseline justify-between gap-3 px-5 py-2.5 text-[13px] ${isBest ? "bg-accent-100" : "opacity-55"}`}
              >
                <span className={isBest ? "font-heading font-extrabold" : ""}>
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
