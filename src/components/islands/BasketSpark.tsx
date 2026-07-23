import type { BasketView } from "@/lib/market";

export function Spark({
  view,
  height = 56,
  endDot = false,
}: {
  view: BasketView;
  height?: number;
  endDot?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 56"
      preserveAspectRatio="none"
      style={{ height }}
      className="block w-full"
      aria-hidden="true"
    >
      <path
        d={view.spark}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1.6}
      />
      {endDot && (
        <circle cx={240} cy={view.sparkEndY} r={3} fill="var(--color-accent)" />
      )}
    </svg>
  );
}

export function CompositionBar({
  view,
  height = 10,
}: {
  view: BasketView;
  height?: number;
}) {
  return (
    <div className="flex gap-0.5" style={{ height }}>
      {view.comp.map((seg) => (
        <div
          key={seg.sym}
          title={seg.sym}
          style={{ width: `${seg.w}%`, background: seg.color }}
        />
      ))}
    </div>
  );
}
