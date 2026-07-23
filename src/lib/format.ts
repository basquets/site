/** Compact formatters for market figures. Every one of these renders an em dash
 *  for null, because "unknown" and "zero" must never look the same. */

const DASH = "—";

export function fmtCompactUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

export function fmtCount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return v.toLocaleString("en-US");
}

/** Token counts: fractional at small sizes, grouped once they get large. */
export function fmtTokens(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  if (v >= 1000) return Math.round(v).toLocaleString("en-US");
  if (v >= 1) return v.toFixed(2);
  return v.toPrecision(3);
}

export function fmtPct(
  fraction: number | null | undefined,
  digits = 1,
): string {
  if (fraction == null || !Number.isFinite(fraction)) return DASH;
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Uniswap fee tiers are hundredths of a bip: 3000 -> "0.30%". */
export function fmtFeeTier(fee: number | null | undefined): string {
  if (fee == null) return DASH;
  return `${(fee / 10_000).toFixed(2)}%`;
}

export function fmtAge(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(sec) || sec < 0) return DASH;
  if (sec < 90) return `${Math.round(sec)}s ago`;
  if (sec < 5400) return `${Math.round(sec / 60)}m ago`;
  if (sec < 172_800) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86_400)}d ago`;
}
