import type { ApiPool, ApiPoolStock } from "@basquets/api-client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { fmtCompactUsd, fmtFeeTier } from "@/lib/format";
import { fmtUsd } from "@/lib/market";
import { useLivePools } from "./use-live-pools";

const AMBER = "oklch(0.80 0.13 85)";

const SORTS = [
  { value: "depth", label: "Depth" },
  { value: "name", label: "A–Z" },
  { value: "pools", label: "# pools" },
  { value: "frag", label: "Fragmentation" },
];

function DepthMeter({
  green,
  yellow,
  scaleMax,
}: {
  green: number;
  yellow: number;
  scaleMax: number;
}) {
  const g = Math.min(100, (green / scaleMax) * 100);
  const y = Math.min(100 - g, (Math.max(0, yellow - green) / scaleMax) * 100);
  return (
    <div className="ml-auto w-[180px] text-left">
      <div className="relative flex h-2 overflow-hidden rounded-[5px] bg-surface">
        <div className="h-full bg-gain" style={{ width: `${g}%` }} />
        <div className="h-full" style={{ width: `${y}%`, background: AMBER }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px]">
        <span className="font-bold text-accent-700">
          {fmtCompactUsd(green)}
        </span>
        <span className="font-bold" style={{ color: AMBER }}>
          {fmtCompactUsd(yellow)}
        </span>
      </div>
    </div>
  );
}

function PoolSubRow({ pool }: { pool: ApiPool }) {
  return (
    <tr className="bg-surface/40 text-[12.5px]">
      <td className="py-2 pl-[41px] text-left">
        <span
          className="mr-2 inline-block size-1.5 rounded-full align-middle"
          style={{
            background: pool.deepest
              ? "var(--color-gain)"
              : "color-mix(in srgb, var(--color-ink) 22%, transparent)",
          }}
        />
        {fmtFeeTier(pool.fee)}
        {pool.deepest && (
          <span className="ml-2 rounded-[5px] bg-accent-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.03em] text-accent-700">
            deepest · routes here
          </span>
        )}
        <span className="ml-2 text-[10px] text-ink/40">
          spacing {pool.tickSpacing}
        </span>
      </td>
      <td className="py-2 text-right text-ink/50">—</td>
      <td className="py-2 text-right tnum">{fmtUsd(pool.price)}</td>
      <td
        className="py-2 text-right text-ink/40"
        title="per-pool $ can't be isolated from v4's singleton"
      >
        —
      </td>
      <td className="py-2 text-right tnum text-ink/50">
        {fmtCompactUsd(pool.depth.greenUsd)} →{" "}
        {fmtCompactUsd(pool.depth.yellowUsd)}
      </td>
    </tr>
  );
}

function StockRow({
  stock,
  scaleMax,
}: {
  stock: ApiPoolStock;
  scaleMax: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-accent/5"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="py-3.5 text-left">
          <span className="inline-flex items-center gap-2.5">
            <span className="w-3 text-[11px] text-accent-700">
              {open ? "▾" : "▸"}
            </span>
            <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-ink text-[12px] font-extrabold text-ground">
              {stock.symbol.slice(0, 2)}
            </span>
            <span>
              <span className="block text-[15px] font-bold">
                {stock.symbol}
              </span>
              <span className="block text-[11.5px] text-ink/48">
                {stock.name}
              </span>
            </span>
          </span>
        </td>
        <td className="py-3.5 text-right">
          <span className="inline-flex justify-end gap-[3px]">
            {Array.from({ length: stock.poolCount }).map((_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count decorative dots, never reordered
                key={i}
                className="inline-block size-1.5 rounded-full bg-accent"
              />
            ))}
          </span>
        </td>
        <td className="py-3.5 text-right">
          {stock.bestFee !== null && (
            <span className="rounded-[5px] bg-accent-100 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.03em] text-accent-700">
              {fmtFeeTier(stock.bestFee)}
            </span>
          )}
        </td>
        <td className="py-3.5 text-right tnum">
          {stock.price ? fmtUsd(stock.price.value) : "—"}
        </td>
        <td className="py-3.5 text-right tnum">
          {stock.pooledValueUsd !== null ? (
            <span className="font-bold">
              {fmtCompactUsd(stock.pooledValueUsd)}
              <span className="block text-[9.5px] font-normal uppercase tracking-[0.05em] text-ink/40">
                stock side
              </span>
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="py-3.5 text-right">
          <DepthMeter
            green={stock.depth.greenUsd}
            yellow={stock.depth.yellowUsd}
            scaleMax={scaleMax}
          />
        </td>
      </tr>
      {open && stock.pools.map((p) => <PoolSubRow key={p.poolId} pool={p} />)}
    </>
  );
}

export default function PoolsTable() {
  const state = useLivePools();
  const [sort, setSort] = useState("depth");
  const [q, setQ] = useState("");

  const stocks = useMemo(() => {
    if (state.mode !== "live") return [];
    const needle = q.toLowerCase();
    const list = state.data.stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(needle) ||
        s.name.toLowerCase().includes(needle),
    );
    const sorted = [...list];
    if (sort === "depth")
      sorted.sort((a, b) => b.depth.yellowUsd - a.depth.yellowUsd);
    else if (sort === "name")
      sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    else if (sort === "pools") sorted.sort((a, b) => b.poolCount - a.poolCount);
    else if (sort === "frag")
      sorted.sort((a, b) => b.fragmentation - a.fragmentation);
    return sorted;
  }, [state, sort, q]);

  if (state.mode === "loading")
    return <p className="text-ink/55">Loading pools…</p>;
  if (state.mode === "unavailable")
    return <p className="text-ink/55">Pool data is unavailable right now.</p>;

  // Scale the depth bars to the deepest stock on screen, so the meter always
  // uses its full width and discriminates the long tail — a fixed ceiling would
  // leave every bar near-empty once the deepest pool is well under it.
  const scaleMax = Math.max(1, ...stocks.map((s) => s.depth.yellowUsd));

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <Segmented
          label="Sort by"
          options={SORTS}
          value={sort}
          onChange={setSort}
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ticker…"
          className="w-[180px]"
        />
      </div>
      <table className="w-full border-collapse tnum">
        <thead>
          <tr className="[&>th]:border-b-2 [&>th]:border-divider [&>th]:pb-2.5 [&>th]:text-[10px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-[0.08em] [&>th]:text-ink/50">
            <th className="text-left">Stock</th>
            <th className="text-right">Pools</th>
            <th className="text-right">Best fee</th>
            <th className="text-right">Price</th>
            <th className="text-right">Pooled value</th>
            <th className="text-right text-accent-700">Depth to slippage ↓</th>
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-divider">
          {stocks.map((s) => (
            <StockRow key={s.address} stock={s} scaleMax={scaleMax} />
          ))}
        </tbody>
      </table>
      <p className="mt-5 max-w-[78ch] text-[11.5px] leading-relaxed text-ink/55">
        <b className="text-ink/72">Pooled value</b> is the stock side of TVL
        (tokens in pools × price), shown per stock — v4 keeps every pool in one
        singleton, so the USDG side and per-pool split can't be isolated.{" "}
        <b className="text-ink/72">Depth</b> is an intra-tick approximation of
        dollars tradable before price moves 0.5% / 2% — informative, not an
        execution guarantee. <b className="text-ink/72">Spacing</b> is the
        pool's tick-grid granularity, tied to the fee tier — not the current
        price tick.
      </p>
    </div>
  );
}
