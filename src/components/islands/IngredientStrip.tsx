import { fmtUsd } from "@/lib/market";
import { TOKENS } from "@/lib/tokens";
import AwaitingMarket from "./AwaitingMarket";
import { tokenChange, useTokenMarket } from "./use-live-market";

const STRIP_SYMS = ["NVDA", "TSLA", "SPY", "AAPL", "META", "COIN", "GOOGL"];

/** Ink-on-light by default; `dark` inverts it for the slab, where the cells sit
 *  on the ink plate and the rules have to lighten rather than darken. */
export type StripTone = "light" | "dark";

const TONE = {
  light: {
    frame: "border-divider",
    cell: "border-divider text-ink hover:bg-surface",
    price: "text-ink/80",
    flat: "text-ink/55",
    up: "text-gain",
    down: "text-loss",
    moreCell: "border-divider bg-surface text-ink hover:bg-accent-100",
    moreLabel: "text-accent-700",
    moreSub: "text-ink/70",
  },
  dark: {
    frame: "border-ground/20",
    cell: "border-ground/20 text-ground hover:bg-ground/8",
    price: "text-ground/75",
    flat: "text-ground/50",
    // The light-surface gain/loss tokens go muddy on ink, so the dark tone
    // steps up two stops for the same semantics.
    up: "text-accent-300",
    down: "text-red-300",
    moreCell: "border-ground/20 bg-ground/8 text-ground hover:bg-accent-500/25",
    moreLabel: "text-accent-300",
    moreSub: "text-ground/60",
  },
} as const;

/** One ruled row of live token cells linking into /stocks. */
export default function IngredientStrip({
  tone = "light",
}: {
  tone?: StripTone;
}) {
  const m = useTokenMarket();
  const t = TONE[tone];
  const shown = STRIP_SYMS.filter((s) => m.hist[s]?.length);
  const rest = TOKENS.length - shown.length;
  if (!shown.length) return <AwaitingMarket mode={m.mode} />;
  return (
    <div
      className={`grid grid-cols-2 border-t-2 border-l-2 sm:grid-cols-4 lg:grid-cols-8 ${t.frame}`}
    >
      {shown.map((sym) => {
        const a = m.hist[sym] as number[];
        const chg = tokenChange(m, sym);
        const up = chg === null ? null : chg >= 0;
        return (
          <a
            key={sym}
            href={`/stocks/${sym.toLowerCase()}`}
            className={`group flex flex-col gap-1 border-r-2 border-b-2 px-4 py-3.5 no-underline transition-colors tnum ${t.cell}`}
          >
            <span className="font-heading font-extrabold text-[15px]">
              {sym}
            </span>
            <span className={`text-[13px] ${t.price}`}>
              {fmtUsd(a.at(-1) ?? 0)}
            </span>
            <span
              className={`text-[12px] ${up === null ? t.flat : up ? t.up : t.down}`}
            >
              {chg === null
                ? "—"
                : `${up ? "+" : ""}${(chg * 100).toFixed(2)}%`}
            </span>
          </a>
        );
      })}
      <a
        href="/stocks"
        className={`flex flex-col justify-center gap-1 border-r-2 border-b-2 px-4 py-3.5 no-underline transition-colors ${t.moreCell}`}
      >
        <span
          className={`font-heading font-extrabold text-[15px] ${t.moreLabel}`}
        >
          +{rest} more →
        </span>
        <span className={`text-[12px] ${t.moreSub}`}>All stock tokens</span>
      </a>
    </div>
  );
}
