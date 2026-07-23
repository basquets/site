import type { ApiToken } from "@basquets/api-client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { Input } from "@/components/ui/input";
import { NATIVE_ETH, USDG, USDG_DECIMALS } from "@/lib/chain";
import { tokenChange, useTokenMarket } from "./use-live-market";

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number; // stock tokens render at 18 until a quote reports otherwise
  disabledReason: string | null;
}

export function toOptions(tokens: Record<string, ApiToken>): TokenOption[] {
  const opts: TokenOption[] = [
    {
      symbol: "USDG",
      name: "Global Dollar",
      address: USDG,
      decimals: USDG_DECIMALS,
      disabledReason: null,
    },
    // Native ETH trades over the healthy ETH/USDG bridge pools; it is also the
    // gas asset, so swapping into it is how a stocks-only wallet refuels.
    {
      symbol: "ETH",
      name: "Ether",
      address: NATIVE_ETH,
      decimals: 18,
      disabledReason: null,
    },
  ];
  for (const t of Object.values(tokens).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  )) {
    const noPool =
      t.stats.poolLiquidity == null || t.stats.poolLiquidity === "0";
    // Real registry values are ASSET_STATUS_* prefixed ("ASSET_STATUS_ACTIVE");
    // strip the prefix before comparing — same gotcha the quote route hit.
    const status = t.status.toUpperCase().replace(/^ASSET_STATUS_/, "");
    opts.push({
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      decimals: 18,
      // "No USDG route", not "no liquidity": several of these tokens hold real
      // balances in the PoolManager via non-USDG pairs (verified 2026-07-23),
      // but our routing only fills through USDG pools and 0x makes no market
      // in them, so they are unswappable here either way.
      disabledReason:
        status !== "ACTIVE"
          ? `Trading ${status.toLowerCase()}`
          : noPool
            ? "No USDG route yet"
            : null,
    });
  }
  return opts;
}

type Group = "held" | "market" | "unavailable";
const GROUP_LABELS: Record<Group, string> = {
  held: "You hold",
  market: "Tradable",
  unavailable: "No USDG route yet",
};

interface Row {
  option: TokenOption;
  price: number | null;
  change: number | null;
  balance: number;
  group: Group;
}

const fmtAmount = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 4 });
const fmtUsd = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Token picker as a real combobox: search drives a listbox with arrow-key
 * navigation, the wallet's own holdings float to the top, tradable tokens show
 * a live price and 24h change, and tokens without a pool sink to the bottom
 * instead of interleaving with the useful rows.
 */
export default function TokenSelect({
  open,
  options,
  balances,
  exclude,
  onPick,
  onClose,
}: {
  open: boolean;
  options: TokenOption[];
  balances: Record<string, bigint>;
  exclude: string | null; // the other side's address
  onPick: (o: TokenOption) => void;
  onClose: () => void;
}) {
  const market = useTokenMarket();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Hand focus back to whatever opened the picker when it closes.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    return () => opener?.focus?.();
  }, [open]);

  // A fresh open starts with a clean query and the first row active.
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    if (!open) return [];
    const query = q.toLowerCase();
    const all = options
      .filter((o) => o.address.toLowerCase() !== exclude?.toLowerCase())
      .filter((o) => `${o.symbol} ${o.name}`.toLowerCase().includes(query))
      .map((o) => {
        const raw = balances[o.address.toLowerCase()] ?? 0n;
        const balance = Number(formatUnits(raw, o.decimals));
        const price =
          o.symbol === "USDG" ? 1 : (market.hist[o.symbol]?.at(-1) ?? null);
        const group: Group =
          balance > 0 ? "held" : o.disabledReason ? "unavailable" : "market";
        return {
          option: o,
          price,
          change: o.symbol === "USDG" ? null : tokenChange(market, o.symbol),
          balance,
          group,
        };
      });
    const byValue = (r: Row) => r.balance * (r.price ?? 0);
    return [
      ...all
        .filter((r) => r.group === "held")
        .sort((a, b) => byValue(b) - byValue(a)),
      ...all.filter((r) => r.group === "market"),
      ...all.filter((r) => r.group === "unavailable"),
    ];
  }, [open, options, balances, exclude, q, market]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new result set restarts keyboard navigation from the top
  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const pickable = (i: number) =>
    rows[i] !== undefined && rows[i].option.disabledReason === null;
  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    do {
      i += dir;
    } while (i >= 0 && i < rows.length && !pickable(i));
    return pickable(i) ? i : from;
  };
  const scrollTo = (i: number) =>
    listRef.current
      ?.querySelector(`#tokopt-${rows[i]?.option.symbol}`)
      ?.scrollIntoView({ block: "nearest" });
  const activeId = rows[active]
    ? `tokopt-${rows[active].option.symbol}`
    : undefined;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      // functional update so rapid repeats never step from a stale index
      setActive((cur) => {
        const next = step(cur, e.key === "ArrowDown" ? 1 : -1);
        scrollTo(next);
        return next;
      });
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const next = e.key === "Home" ? step(-1, 1) : step(rows.length, -1);
      setActive(next);
      scrollTo(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = rows[active];
      if (r && r.option.disabledReason === null) {
        onPick(r.option);
        onClose();
      }
    }
  };

  let lastGroup: Group | null = null;

  return (
    <div className="absolute inset-x-0 top-full z-20 mt-2 border-2 border-ink bg-ground shadow-lg">
      <div className="border-b-2 border-divider p-3">
        <Input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="token-select-listbox"
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          placeholder={`Search ${options.length} tokens…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search tokens"
        />
      </div>
      <div
        ref={listRef}
        id="token-select-listbox"
        role="listbox"
        aria-label="Tokens"
        className="m-0 max-h-80 list-none overflow-y-auto p-0"
      >
        {rows.map((r, i) => {
          const header =
            r.group !== lastGroup ? (
              <div
                role="presentation"
                className="border-b border-divider bg-surface px-4 py-1.5 text-[10px] uppercase tracking-[0.1em] text-ink/50"
              >
                {GROUP_LABELS[r.group]}
              </div>
            ) : null;
          lastGroup = r.group;
          const disabled = r.option.disabledReason !== null;
          return (
            <Fragment key={r.option.symbol}>
              {header}
              <div
                id={`tokopt-${r.option.symbol}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                aria-disabled={disabled || undefined}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={disabled}
                  onMouseEnter={() => !disabled && setActive(i)}
                  onClick={() => {
                    onPick(r.option);
                    onClose();
                  }}
                  className={`flex w-full items-baseline gap-3 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-45 ${i === active && !disabled ? "bg-surface" : ""}`}
                >
                  <span className="w-14 flex-none font-heading font-extrabold">
                    {r.option.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink/60">
                    {r.option.name.split("•")[0].trim()}
                  </span>
                  {disabled ? (
                    <span className="text-[12px] text-ink/50">
                      {r.option.disabledReason}
                    </span>
                  ) : r.group === "held" ? (
                    <span className="text-[12.5px] text-ink tnum">
                      {fmtAmount(r.balance)}
                      {r.price !== null && (
                        <span className="text-ink/55">
                          {" "}
                          · {fmtUsd(r.balance * r.price)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <>
                      <span className="w-20 flex-none text-right text-[12.5px] tnum">
                        {r.price !== null ? fmtUsd(r.price) : ""}
                      </span>
                      <span
                        className={`w-14 flex-none text-right text-[12px] tnum ${
                          r.change == null
                            ? "text-ink/40"
                            : r.change >= 0
                              ? "text-gain"
                              : "text-loss"
                        }`}
                      >
                        {r.change == null
                          ? ""
                          : `${r.change >= 0 ? "+" : ""}${(r.change * 100).toFixed(1)}%`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <div className="px-4 py-3 text-[13px] text-ink/55">No matches.</div>
        )}
      </div>
    </div>
  );
}
