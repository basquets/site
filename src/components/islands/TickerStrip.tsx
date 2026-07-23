import { fmtUsd, TICKER_SYMBOLS } from "@/lib/market";
import {
  type TokenMarket,
  tokenChange,
  useTokenMarket,
} from "./use-live-market";

interface TickerEntry {
  sym: string;
  price: string;
  chg: string;
  /** null while the 24h change is still unknown */
  up: boolean | null;
}

function entries(m: TokenMarket): TickerEntry[] {
  return TICKER_SYMBOLS.filter((s) => m.hist[s]).map((s) => {
    const arr = m.hist[s] as number[];
    const chg = tokenChange(m, s);
    return {
      sym: s,
      price: fmtUsd(arr[arr.length - 1] ?? 0),
      chg:
        chg === null ? "—" : `${chg >= 0 ? "+" : ""}${(chg * 100).toFixed(2)}%`,
      up: chg === null ? null : chg >= 0,
    };
  });
}

function TickerGroup({ entries }: { entries: TickerEntry[] }) {
  return (
    <>
      {entries.map((tk) => (
        <div
          key={tk.sym}
          className="flex items-baseline gap-2 whitespace-nowrap border-r border-divider px-5.5 py-1.75 text-[12.5px] tnum"
        >
          <span className="font-heading font-extrabold">{tk.sym}</span>
          <span>{tk.price}</span>
          <span
            className={
              tk.up === null ? "text-ink/55" : tk.up ? "text-gain" : "text-loss"
            }
          >
            {tk.chg}
          </span>
        </div>
      ))}
    </>
  );
}

export default function TickerStrip() {
  const m = useTokenMarket();
  const list = entries(m);
  return (
    <div className="overflow-hidden bg-ground">
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
        <div className="flex">
          <TickerGroup entries={list} />
        </div>
        <div className="flex" aria-hidden="true">
          <TickerGroup entries={list} />
        </div>
      </div>
    </div>
  );
}
