/**
 * Deterministic backdrop of drifting recipe bars: columns of small segmented
 * composition bars, the basket's visual signature, translating slowly like
 * TickerRain. Shares the `ticker-rain` class so the same reduced-motion kill
 * switch applies, and the columns animate transform only.
 */
export default function RecipeRain() {
  let rng = 11;
  const rand = () => {
    rng = (rng * 16807) % 2147483647;
    return rng / 2147483647;
  };
  const cols = Array.from({ length: 6 }, (_, i) => {
    const bars = Array.from({ length: 8 }, (_, j) => {
      const segments = 3 + Math.floor(rand() * 3);
      const weights = Array.from({ length: segments }, () => 0.15 + rand());
      const total = weights.reduce((a, w) => a + w, 0);
      const strong = rand() < 0.14;
      return {
        key: j,
        width: 96 + Math.floor(rand() * 72),
        opacity: strong ? 0.3 : 0.08 + rand() * 0.08,
        segs: weights.map((w, k) => ({ key: k, pct: (w / total) * 100 })),
      };
    });
    // double the stack so the -50% translate loops seamlessly, like TickerRain
    return {
      bars: [...bars, ...bars].map((b, j) => ({ ...b, key: j })),
      anim: i % 2 ? "bq-col-down" : "bq-col-up",
      dur: `${(38 + rand() * 26).toFixed(0)}s`,
    };
  });
  return (
    <div
      aria-hidden="true"
      className="ticker-rain pointer-events-none absolute inset-0 z-0 flex justify-between overflow-hidden"
    >
      {cols.map((c, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative columns
          key={i}
          className="flex h-full min-w-0 flex-1 justify-center overflow-hidden border-r border-ground/10"
        >
          <div
            className="flex w-max flex-col gap-11"
            style={{ animation: `${c.anim} ${c.dur} linear infinite` }}
          >
            {c.bars.map((b) => (
              <span
                key={b.key}
                className="flex h-2 gap-0.5"
                style={{ width: `${b.width}px`, opacity: b.opacity }}
              >
                {b.segs.map((s) => (
                  <span
                    key={s.key}
                    className="h-full bg-ground"
                    style={{ width: `${s.pct}%` }}
                  />
                ))}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
