import { BASKET_BY_SYMBOL, COMP_COLORS } from "@/lib/market";
import AwaitingMarket from "./AwaitingMarket";
import { useTokenMarket } from "./use-live-market";

/** Normalized percent-change lines for every ingredient in a basket recipe. */
export default function IngredientChart({ symbol }: { symbol: string }) {
  const { hist, mode } = useTokenMarket();
  const def = BASKET_BY_SYMBOL[symbol];
  // Only components the API actually priced are drawn; a line has to come from
  // real points or not exist.
  const syms = Object.keys(def.recipe).filter(
    (s) => (hist[s]?.length ?? 0) > 1,
  );

  const pct: Record<string, number[]> = {};
  let pMin = Number.POSITIVE_INFINITY;
  let pMax = Number.NEGATIVE_INFINITY;
  for (const s of syms) {
    const a = hist[s] as number[];
    pct[s] = a.map((v) => (v / a[0] - 1) * 100);
    pMin = Math.min(pMin, ...pct[s]);
    pMax = Math.max(pMax, ...pct[s]);
  }
  if (!syms.length)
    return <AwaitingMarket mode={mode} subject="Component history" />;
  const range = pMax - pMin || 1;
  const yOf = (v: number) => 6 + ((pMax - v) / range) * 88;
  const lines = syms.map((s, i) => ({
    sym: s,
    color: COMP_COLORS[i % COMP_COLORS.length],
    path: pct[s]
      .map(
        (v, j) =>
          `${j ? "L" : "M"}${((j * 240) / 47).toFixed(1)},${yOf(v).toFixed(1)}`,
      )
      .join(" "),
    last: `${pct[s][47] >= 0 ? "+" : ""}${pct[s][47].toFixed(2)}%`,
  }));

  return (
    <div>
      <svg
        viewBox="0 0 240 100"
        preserveAspectRatio="none"
        className="block h-60 w-full border-b-2 border-l-2 border-divider"
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={yOf(0)}
          x2={240}
          y2={yOf(0)}
          stroke="var(--color-neutral-300)"
          strokeWidth={0.6}
          strokeDasharray="3 3"
        />
        {lines.map((l) => (
          <path
            key={l.sym}
            d={l.path}
            fill="none"
            stroke={l.color}
            strokeWidth={1.1}
          />
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2.5">
        {lines.map((l) => (
          <a
            key={l.sym}
            href={`/stocks/${l.sym.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-[13px] text-ink no-underline tnum hover:text-accent-700"
          >
            <span
              className="size-2.5 flex-none"
              style={{ background: l.color }}
            />
            <span className="font-heading font-extrabold">{l.sym}</span>
            <span className="text-ink/60">{l.last}</span>
          </a>
        ))}
      </div>
      <p className="mt-3.5 mb-0 text-[12px] uppercase tracking-[0.08em] text-ink/55 tnum">
        Percent change over the last 48 oracle updates, normalized
      </p>
    </div>
  );
}
