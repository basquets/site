/** Maps quote depth + the user's USD size onto the three-zone gauge
 *  (green 0-52%, yellow 52-78%, red 78-100% of the bar) and phrases the verdict. */
export interface GaugeVm {
  zone: "green" | "yellow" | "red" | "unknown";
  markerPct: number; // 0..100 position on the bar
  greenEndsAtUsd: number | null;
  verdict: string;
}

const GREEN_END = 52;
const YELLOW_END = 78;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (f: number) => `${(f * 100).toFixed(2)}%`;

export function gaugeModel(
  depth: { greenMaxUsd: number; yellowMaxUsd: number } | null,
  amountUsd: number,
  impact: number | null,
): GaugeVm {
  if (!depth || depth.yellowMaxUsd <= 0) {
    return {
      zone: "unknown",
      markerPct: 0,
      greenEndsAtUsd: null,
      verdict:
        "Depth data is unavailable for this pair — the review step still enforces your minimum received.",
    };
  }
  let zone: GaugeVm["zone"];
  let markerPct: number;
  if (amountUsd <= depth.greenMaxUsd) {
    zone = "green";
    markerPct = (amountUsd / depth.greenMaxUsd) * GREEN_END;
  } else if (amountUsd <= depth.yellowMaxUsd) {
    zone = "yellow";
    markerPct =
      GREEN_END +
      ((amountUsd - depth.greenMaxUsd) /
        (depth.yellowMaxUsd - depth.greenMaxUsd)) *
        (YELLOW_END - GREEN_END);
  } else {
    zone = "red";
    markerPct = Math.min(
      100,
      YELLOW_END +
        ((amountUsd - depth.yellowMaxUsd) / depth.yellowMaxUsd) *
          (100 - YELLOW_END),
    );
  }
  const impactTxt = impact != null ? pct(impact) : "unknown";
  const verdict =
    zone === "green"
      ? `Size looks good. Price impact ${impactTxt}. You can go up to ${usd(depth.greenMaxUsd)} before impact passes 0.5%.`
      : zone === "yellow"
        ? `Noticeable impact: ${impactTxt}. Below ${usd(depth.greenMaxUsd)} it would stay under 0.5%.`
        : `Large for this pool: impact ${impactTxt}${impact != null ? ` ≈ ${usd(amountUsd * impact)} lost to slippage` : ""}. Consider splitting into smaller trades.`;
  return { zone, markerPct, greenEndsAtUsd: depth.greenMaxUsd, verdict };
}
