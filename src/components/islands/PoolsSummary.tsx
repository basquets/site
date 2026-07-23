import { fmtCompactUsd } from "@/lib/format";
import { useLivePools } from "./use-live-pools";

const AMBER = "oklch(0.80 0.13 85)";

/** 4-tile stat strip for the dark pools hero. Renders nothing until live data
 *  lands — the hero copy stands fine on its own while loading. */
export default function PoolsSummary() {
  const state = useLivePools();
  if (state.mode !== "live") return null;

  const s = state.data.summary;
  const noPool = s.stocksTotal - s.stocksWithLiquidity;
  const tiles = [
    { n: fmtCompactUsd(s.totalDepthYellowUsd), l: "Depth to 2%" },
    { n: String(s.activePools), l: "Active pools" },
    {
      n: `${s.stocksWithLiquidity}/${s.stocksTotal}`,
      l: "Stocks with liquidity",
    },
    { n: String(noPool), l: "Stocks with no pool", warn: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.l}
          className="rounded-[10px] border border-ground/20 px-4 py-3.5"
        >
          <div
            className="text-[26px] font-extrabold tracking-[-0.01em]"
            style={t.warn ? { color: AMBER } : undefined}
          >
            {t.n}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.06em] text-ground/55">
            {t.l}
          </div>
        </div>
      ))}
    </div>
  );
}
