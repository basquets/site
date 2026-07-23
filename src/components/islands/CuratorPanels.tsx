import {
  BASKET_BY_SYMBOL,
  basketView,
  CURATOR_BY_HANDLE,
  fmtUsd,
  type History,
} from "@/lib/market";
import { STREAMING_FEE_LABEL } from "@/lib/protocol";
import AwaitingMarket from "./AwaitingMarket";
import { Spark } from "./BasketSpark";
import { useTokenMarket } from "./use-live-market";

function basketHref(symbol: string) {
  return `/baskets/${symbol.toLowerCase()}`;
}

/** Returns null while any holding is unpriced: a portfolio total that silently
 *  omits a position is a wrong total, not a partial one. */
function portfolio(handle: string, hist: History) {
  const profile = CURATOR_BY_HANDLE[handle];
  let totalValue = 0;
  let totalCost = 0;
  const views = profile.holdings.map(([symbol]) =>
    basketView(BASKET_BY_SYMBOL[symbol], hist),
  );
  if (views.some((v) => v === null)) return null;
  const rows = profile.holdings.map(([symbol, shares, costFactor], i) => {
    const def = BASKET_BY_SYMBOL[symbol];
    const nav = (views[i] as NonNullable<(typeof views)[number]>).navRaw;
    const value = nav * shares;
    const cost = value * costFactor;
    totalValue += value;
    totalCost += cost;
    const pnl = (value / cost - 1) * 100;
    return {
      symbol,
      name: def.name,
      by: def.curator,
      shares: shares.toLocaleString("en-US", { minimumFractionDigits: 1 }),
      nav: fmtUsd(nav),
      value: fmtUsd(value),
      pnl: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`,
      up: pnl >= 0,
    };
  });
  const totalPnl = (totalValue / totalCost - 1) * 100;
  return {
    rows,
    value: fmtUsd(totalValue),
    pnl: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}%`,
    up: totalPnl >= 0,
  };
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div>
      <p
        className={`m-0 font-heading font-extrabold text-[clamp(22px,2.2vw,30px)] tnum ${tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 mb-0 text-[11px] uppercase tracking-[0.08em] text-ink/55">
        {label}
      </p>
    </div>
  );
}

export function CuratorStats({ handle }: { handle: string }) {
  const { hist, mode } = useTokenMarket();
  const profile = CURATOR_BY_HANDLE[handle];
  const p = portfolio(handle, hist);
  return (
    <div className="mt-7 flex flex-wrap gap-x-[clamp(24px,4vw,56px)] gap-y-5">
      <Stat value={p ? p.value : "—"} label="Portfolio value" />
      <Stat
        value={p ? p.pnl : "—"}
        label="Total P&L"
        tone={p ? (p.up ? "gain" : "loss") : undefined}
      />
      {profile.curates.length > 0 && (
        <>
          <Stat
            value={String(profile.curates.length)}
            label="Baskets curated"
          />
          <Stat value={profile.holders} label="Holders" />
        </>
      )}
      <Stat value={profile.since} label="On Basquets since" />
    </div>
  );
}

export function CuratorHoldings({ handle }: { handle: string }) {
  const { hist, mode } = useTokenMarket();
  const p = portfolio(handle, hist);
  if (!p) return <AwaitingMarket mode={mode} subject="Portfolio values" />;
  return (
    <table className="w-full border-collapse text-sm tnum">
      <thead>
        <tr>
          {["Basket", "Shares", "NAV", "Value", "P&L", ""].map((h, i) => (
            <th
              key={h || "link"}
              scope="col"
              className={`border-b-2 border-divider p-2 text-[11px] uppercase tracking-[0.08em] text-ink/60 ${i ? "text-right" : "text-left"} ${i === 1 || i === 2 ? "max-md:hidden" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {p.rows.map((r) => (
          <tr key={r.symbol} className="hover:bg-surface">
            <td className="border-b border-divider p-2">
              <a
                href={basketHref(r.symbol)}
                className="flex flex-col gap-px text-ink no-underline"
              >
                <span className="font-heading font-extrabold text-[15px]">
                  {r.symbol}
                </span>
                <span className="text-[12px] text-ink/60">
                  {r.name} · by {r.by}
                </span>
              </a>
            </td>
            <td className="whitespace-nowrap border-b border-divider p-2 text-right max-md:hidden">
              {r.shares}
            </td>
            <td className="whitespace-nowrap border-b border-divider p-2 text-right max-md:hidden">
              {r.nav}
            </td>
            <td className="whitespace-nowrap border-b border-divider p-2 text-right font-heading font-extrabold">
              {r.value}
            </td>
            <td
              className={`whitespace-nowrap border-b border-divider p-2 text-right ${r.up ? "text-gain" : "text-loss"}`}
            >
              {r.pnl}
            </td>
            <td className="border-b border-divider p-2 text-right">
              <a
                href={basketHref(r.symbol)}
                aria-label={`View ${r.symbol}`}
                className="font-heading font-extrabold text-accent-700 no-underline"
              >
                →
              </a>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="p-2 font-heading font-extrabold text-accent-700">
            Total
          </td>
          <td className="max-md:hidden" />
          <td className="max-md:hidden" />
          <td className="p-2 text-right font-heading font-extrabold">
            {p.value}
          </td>
          <td className={`p-2 text-right ${p.up ? "text-gain" : "text-loss"}`}>
            {p.pnl}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

export function CuratorShelf({ handle }: { handle: string }) {
  const { hist, mode } = useTokenMarket();
  const profile = CURATOR_BY_HANDLE[handle];
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-7">
      {profile.curates.map((symbol) => {
        const def = BASKET_BY_SYMBOL[symbol];
        const view = basketView(def, hist);
        if (!view) {
          return (
            <div key={symbol} className="border border-divider p-5.5">
              <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
                {symbol}
              </span>
              <h3 className="m-0 mt-2.5 text-xl tracking-[-0.01em]">
                {def.name}
              </h3>
              <AwaitingMarket mode={mode} subject="NAV" />
            </div>
          );
        }
        return (
          <a
            key={symbol}
            href={basketHref(symbol)}
            className="flex flex-col gap-2.5 border border-divider p-5.5 text-ink no-underline hover:bg-surface"
          >
            <span className="flex items-baseline justify-between gap-2.5">
              <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700">
                {symbol}
              </span>
              <span className="text-[11px] text-ink/55 tnum">
                holding fee {STREAMING_FEE_LABEL}
              </span>
            </span>
            <h3 className="m-0 text-xl tracking-[-0.01em]">{def.name}</h3>
            <span className="flex items-baseline gap-2.5">
              <span className="font-heading font-extrabold text-[26px] tnum">
                {view.nav}
              </span>
              <span
                className={`text-[13px] tnum ${view.up == null ? "text-ink/55" : view.up ? "text-gain" : "text-loss"}`}
              >
                {view.chg ?? "—"}
              </span>
            </span>
            <Spark view={view} height={40} />
            <span className="text-[12px] text-ink/70 tnum">
              {view.compLabel} · {def.holders} holders
            </span>
          </a>
        );
      })}
    </div>
  );
}
