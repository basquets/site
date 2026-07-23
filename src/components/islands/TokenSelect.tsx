import type { ApiToken } from "@basquets/api-client";
import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import { Input } from "@/components/ui/input";
import { USDG, USDG_DECIMALS } from "@/lib/chain";

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
      disabledReason:
        status !== "ACTIVE"
          ? `Trading ${status.toLowerCase()}`
          : noPool
            ? "No onchain liquidity yet"
            : null,
    });
  }
  return opts;
}

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
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      options
        .filter((o) => o.address.toLowerCase() !== exclude?.toLowerCase())
        .filter((o) =>
          `${o.symbol} ${o.name}`.toLowerCase().includes(q.toLowerCase()),
        ),
    [options, q, exclude],
  );
  if (!open) return null;
  return (
    <div className="absolute inset-x-0 top-full z-20 mt-2 border-2 border-ink bg-ground shadow-none">
      <div className="border-b-2 border-divider p-3">
        <Input
          autoFocus
          placeholder={`Search ${options.length} tokens…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search tokens"
        />
      </div>
      <ul className="m-0 max-h-72 list-none overflow-y-auto p-0">
        {list.map((o) => {
          const bal = balances[o.address.toLowerCase()];
          return (
            <li key={o.address}>
              <button
                type="button"
                disabled={o.disabledReason !== null}
                onClick={() => {
                  onPick(o);
                  onClose();
                  setQ("");
                }}
                className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="font-heading font-extrabold">{o.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink/60">
                  {o.name}
                </span>
                <span className="text-[12px] text-ink/70 tnum">
                  {o.disabledReason ??
                    (bal !== undefined
                      ? Number(formatUnits(bal, o.decimals)).toLocaleString(
                          "en-US",
                          { maximumFractionDigits: 4 },
                        )
                      : "")}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="px-4 py-3 text-[13px] text-ink/55">No matches.</li>
        )}
      </ul>
    </div>
  );
}
