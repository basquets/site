import type { GaugeVm } from "@/lib/swap/gauge-model";

const ZONE_STYLES: Record<GaugeVm["zone"], string> = {
  green: "border-emerald-700 bg-emerald-50 text-emerald-900",
  yellow: "border-amber-600 bg-amber-50 text-amber-900",
  red: "border-red-700 bg-red-50 text-red-900",
  unknown: "border-ink/40 bg-ground text-ink/70",
};

/** Three-zone pool-depth bar + plain-language verdict. Pure presentational —
 *  all numbers come from gaugeModel(). */
export default function DepthGauge({
  vm,
  pairLabel,
}: {
  vm: GaugeVm;
  pairLabel: string;
}) {
  return (
    <div>
      <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-ink/55">
        Pool depth · {pairLabel}
      </p>
      <div
        className="relative mt-3 h-5 border-2 border-ink"
        role="img"
        aria-label={vm.verdict}
      >
        <div
          className="absolute inset-y-0 left-0 bg-emerald-300/70"
          style={{ width: "52%" }}
        />
        <div
          className="absolute inset-y-0 bg-amber-300/70"
          style={{ left: "52%", width: "26%" }}
        />
        <div
          className="absolute inset-y-0 bg-red-300/70"
          style={{ left: "78%", right: 0 }}
        />
        {vm.zone !== "unknown" && (
          <div
            className="absolute -top-1 -bottom-1 w-[3px] bg-ink"
            style={{ left: `${vm.markerPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink/55 tnum">
        <span>&lt;0.5% impact</span>
        <span>&lt;2%</span>
        <span>over</span>
      </div>
      <p
        className={`mt-3 mb-0 border-2 px-3 py-2 text-[13px] leading-5 ${ZONE_STYLES[vm.zone]}`}
      >
        {vm.verdict}
      </p>
    </div>
  );
}
