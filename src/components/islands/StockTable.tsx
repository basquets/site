import type { PriceSource } from "@basquets/api-client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { fmtCompactUsd, fmtCount, fmtPct, fmtTokens } from "@/lib/format";
import { fmtUsd, sparkPath } from "@/lib/market";
import { TOKEN_SECTORS, TOKENS, type TokenInfo } from "@/lib/tokens";
import {
  type TokenMarket,
  tokenChange,
  useTokenMarket,
} from "./use-live-market";

const SORTS = [
  { value: "mcap", label: "Market cap" },
  { value: "name", label: "A-Z" },
  { value: "holders", label: "Holders" },
  { value: "supply", label: "Supply" },
  { value: "chg", label: "Change" },
];
const VIEWS = [
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
];

/** Direction colour shared by every price line, spark and delta on the page. */
function trendColor(up: boolean | null): string {
  return up == null
    ? "var(--color-ink)"
    : up
      ? "var(--color-gain)"
      : "var(--color-loss)";
}

function trendClass(up: boolean | null): string {
  return up == null ? "text-ink/55" : up ? "text-gain" : "text-loss";
}

function tokenHref(sym: string) {
  return `/stocks/${sym.toLowerCase()}`;
}

interface RowView extends TokenInfo {
  price: string;
  chg: number | null;
  chgLabel: string | null;
  up: boolean | null;
  spark: string | null;
  source: PriceSource | null;
  stale: boolean;
  marketCap: number | null;
  supply: number | null;
  holders: number | null;
  poolShare: number | null;
}

function rowView(t: TokenInfo, m: TokenMarket): RowView {
  const arr = m.hist[t.sym];
  const stats = m.tokens[t.sym]?.stats;
  const chg = arr ? tokenChange(m, t.sym) : null;
  return {
    ...t,
    price: arr ? fmtUsd(arr.at(-1) ?? 0) : "—",
    chg,
    chgLabel:
      chg === null
        ? null
        : `${chg >= 0 ? "▲ +" : "▼ "}${(chg * 100).toFixed(2)}%`,
    up: chg === null ? null : chg >= 0,
    spark: arr ? sparkPath(arr, 240, 32) : null,
    source: m.tokens[t.sym]?.price?.source ?? null,
    stale: m.tokens[t.sym]?.price?.stale ?? false,
    marketCap: stats?.onchainMarketCap ?? null,
    supply: stats?.totalSupply ?? null,
    holders: stats?.holders ?? null,
    poolShare: stats?.poolShare ?? null,
  };
}

/** Unknown values always sort last: a missing figure is not a small one. */
function byDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/** Only says something when the price needs a caveat. */
function SourceTag({ row }: { row: RowView }) {
  const tag =
    row.source === "pool"
      ? {
          text: "pool",
          title:
            "No Chainlink feed for this token. Price is the spot rate from its deepest Uniswap v4 pool.",
        }
      : row.stale
        ? {
            text: "stale",
            title:
              "The Chainlink feed has not updated recently. Stock feeds run 24/5 and freeze when US markets close.",
          }
        : null;
  if (!tag) return null;
  return (
    <span
      title={tag.title}
      className="ml-1 text-[10px] uppercase tracking-[0.06em] text-ink/55"
    >
      {tag.text}
    </span>
  );
}

const HEADERS = [
  { label: "Token", align: "text-left", hide: "" },
  { label: "Trend", align: "text-left", hide: "max-lg:hidden" },
  { label: "Price", align: "text-right", hide: "" },
  { label: "24h", align: "text-right", hide: "" },
  { label: "Onchain mcap", align: "text-right", hide: "max-md:hidden" },
  { label: "Supply", align: "text-right", hide: "max-xl:hidden" },
  { label: "Holders", align: "text-right", hide: "max-lg:hidden" },
  { label: "In pools", align: "text-right", hide: "max-xl:hidden" },
  { label: "", align: "text-right", hide: "" },
];

export default function StockTable() {
  const m = useTokenMarket();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [sort, setSort] = useState("mcap");
  // Cards lead: the grid reads as a market at a glance, the table is the
  // opt-in for comparing figures column by column.
  const [view, setView] = useState("cards");

  const q = query.trim().toLowerCase();
  const rows = TOKENS.filter(
    (t) =>
      (sector === "All" || t.sector === sector) &&
      (!q ||
        t.sym.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)),
  )
    .map((t) => rowView(t, m))
    .sort((a, b) => {
      switch (sort) {
        case "name":
          return a.sym.localeCompare(b.sym);
        case "holders":
          return byDesc(a.holders, b.holders) || a.sym.localeCompare(b.sym);
        case "supply":
          return byDesc(a.supply, b.supply) || a.sym.localeCompare(b.sym);
        case "chg":
          return byDesc(a.chg, b.chg) || a.sym.localeCompare(b.sym);
        default:
          return byDesc(a.marketCap, b.marketCap) || a.sym.localeCompare(b.sym);
      }
    });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-7 gap-y-4 py-7">
        <div className="min-w-[220px] max-w-[380px] flex-1">
          <Label htmlFor="stock-search">Search</Label>
          <Input
            id="stock-search"
            type="text"
            placeholder="Ticker or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="stock-sector">Sector</Label>
          <div id="stock-sector">
            <Segmented
              label="Sector"
              value={sector}
              onChange={setSector}
              options={["All", ...TOKEN_SECTORS].map((s) => ({
                value: s,
                label: s,
              }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="stock-sort">Sort by</Label>
          <div id="stock-sort">
            <Segmented
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={SORTS}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="stock-view">View</Label>
          <div id="stock-view">
            <Segmented
              label="View"
              value={view}
              onChange={setView}
              options={VIEWS}
            />
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <p className="mb-3.5 text-[12px] uppercase tracking-[0.08em] text-ink/55 tnum">
          {rows.length === TOKENS.length
            ? `${rows.length} tokens`
            : `${rows.length} of ${TOKENS.length} tokens`}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="m-0 py-10 text-[15.5px] leading-7 text-ink/70">
          No tokens match "{query}". US-listed stocks and ETFs only; new tokens
          appear here the moment Robinhood registers them onchain.
        </p>
      ) : view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm tnum">
            <thead>
              {/* Sticks while you scroll 96 rows, so the columns stay named. */}
              <tr className="sticky top-0 z-10 bg-ground">
                {HEADERS.map((h) => (
                  <th
                    key={h.label || "link"}
                    scope="col"
                    className={`border-b-2 border-divider p-2 text-[11px] uppercase tracking-[0.08em] text-ink/60 ${h.align} ${h.hide}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sym} className="hover:bg-surface">
                  <td className="border-b border-divider p-2">
                    <a
                      href={tokenHref(r.sym)}
                      className="flex flex-col gap-px text-ink no-underline"
                    >
                      <span className="font-heading font-extrabold text-[15px]">
                        {r.sym}
                      </span>
                      <span className="text-[12px] text-ink/60">{r.name}</span>
                    </a>
                  </td>
                  <td className="w-[150px] border-b border-divider p-2 max-lg:hidden">
                    {r.spark && (
                      <svg
                        viewBox="0 0 240 32"
                        preserveAspectRatio="none"
                        className="block h-[26px] w-[130px]"
                        aria-hidden="true"
                      >
                        <path
                          d={r.spark}
                          fill="none"
                          stroke={trendColor(r.up)}
                          strokeWidth={2}
                        />
                      </svg>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-divider p-2 text-right">
                    <span className="font-heading font-extrabold">
                      {r.price}
                    </span>
                    <SourceTag row={r} />
                  </td>
                  <td
                    className={`whitespace-nowrap border-b border-divider p-2 text-right ${trendClass(r.up)}`}
                  >
                    {r.chgLabel ?? "—"}
                  </td>
                  <td className="whitespace-nowrap border-b border-divider p-2 text-right max-md:hidden">
                    {fmtCompactUsd(r.marketCap)}
                  </td>
                  <td className="whitespace-nowrap border-b border-divider p-2 text-right max-xl:hidden">
                    {fmtTokens(r.supply)}
                  </td>
                  <td className="whitespace-nowrap border-b border-divider p-2 text-right max-lg:hidden">
                    {fmtCount(r.holders)}
                  </td>
                  <td className="whitespace-nowrap border-b border-divider p-2 text-right text-ink/70 max-xl:hidden">
                    {fmtPct(r.poolShare)}
                  </td>
                  <td className="border-b border-divider p-2 text-right">
                    <a
                      href={tokenHref(r.sym)}
                      aria-label={`View ${r.sym}`}
                      className="font-heading font-extrabold text-accent-700 no-underline"
                    >
                      →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))] gap-0.5 border-2 border-divider bg-divider">
          {rows.map((r) => (
            <a
              key={r.sym}
              href={tokenHref(r.sym)}
              className="group flex flex-col bg-ground p-5 text-ink no-underline transition-colors hover:bg-surface"
            >
              <span className="flex items-baseline justify-between gap-2.5">
                <span className="font-heading font-extrabold text-xl tracking-[-0.01em] transition-colors group-hover:text-accent-700">
                  {r.sym}
                </span>
                <Badge variant="neutral">{r.sector}</Badge>
              </span>
              <span className="mt-1 truncate text-[13px] text-ink/65">
                {r.name}
              </span>

              {/* Price leads, the delta rides beside it, the trend sits under
                  both so the eye lands on the number first. */}
              <span className="mt-4 flex items-baseline justify-between gap-2.5 tnum">
                <span className="font-heading font-extrabold text-[21px] leading-none">
                  {r.price}
                  <SourceTag row={r} />
                </span>
                <span className={`text-[13px] ${trendClass(r.up)}`}>
                  {r.chgLabel ?? "—"}
                </span>
              </span>
              <svg
                viewBox="0 0 240 32"
                preserveAspectRatio="none"
                className="mt-3 block h-10 w-full"
                aria-hidden="true"
              >
                {r.spark ? (
                  <path
                    d={r.spark}
                    fill="none"
                    stroke={trendColor(r.up)}
                    strokeWidth={1.8}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <line
                    x1="0"
                    y1="16"
                    x2="240"
                    y2="16"
                    stroke="var(--color-divider)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>

              <dl className="m-0 mt-4 grid grid-cols-3 gap-2 border-t border-divider pt-3 text-[11px] tnum">
                {[
                  { k: "Mcap", v: fmtCompactUsd(r.marketCap) },
                  { k: "Holders", v: fmtCount(r.holders) },
                  { k: "In pools", v: fmtPct(r.poolShare) },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="m-0 uppercase tracking-[0.06em] text-ink/45">
                      {s.k}
                    </dt>
                    <dd className="m-0 mt-0.5 text-[12.5px] text-ink/75">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
