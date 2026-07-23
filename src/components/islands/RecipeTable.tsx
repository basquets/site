import {
  BASKET_BY_SYMBOL,
  BASKET_DEFS,
  basketView,
  fmtUsd,
} from "@/lib/market";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

export default function RecipeTable({
  symbol,
  showColors = false,
}: {
  symbol?: string;
  showColors?: boolean;
}) {
  const { hist, mode } = useTokenMarket();
  const def = (symbol && BASKET_BY_SYMBOL[symbol]) || BASKET_DEFS[0];
  const view = basketView(def, hist);
  if (!view) return <AwaitingMarket mode={mode} subject="Component prices" />;
  const rows = view.comp.map((seg) => ({
    sym: seg.sym,
    color: seg.color,
    units: (def.recipe[seg.sym] ?? 0).toFixed(2),
    price: fmtUsd(hist[seg.sym]?.at(-1) ?? 0),
    weight: `${seg.w.toFixed(1)}%`,
  }));
  return (
    <table className="w-full border-collapse text-sm tnum">
      <thead>
        <tr>
          {["Token", "Units / share", "Price", "Weight"].map((h, i) => (
            <th
              key={h}
              scope="col"
              className={`border-b-2 border-divider p-2 text-[11px] uppercase tracking-[0.08em] text-ink/60 ${i ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sym} className="hover:bg-ink/4">
            <td className="border-b border-divider p-2 font-heading font-extrabold">
              <a
                href={`/stocks/${r.sym.toLowerCase()}`}
                className="inline-flex items-center gap-2.5 text-ink no-underline hover:text-accent-700"
              >
                {showColors && (
                  <span
                    className="size-2.5 flex-none"
                    style={{ background: r.color }}
                  />
                )}
                {r.sym}
              </a>
            </td>
            <td className="border-b border-divider p-2 text-right">
              {r.units}
            </td>
            <td className="border-b border-divider p-2 text-right">
              {r.price}
            </td>
            <td className="border-b border-divider p-2 text-right">
              {r.weight}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td
            colSpan={3}
            className="p-2 font-heading font-extrabold text-accent-700"
          >
            NAV / share
          </td>
          <td className="p-2 text-right font-heading font-extrabold">
            {view.nav}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
