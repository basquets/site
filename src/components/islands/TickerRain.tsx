const SYMS = [
  "NVDA",
  "AAPL",
  "SPY",
  "TSLA",
  "MSFT",
  "META",
  "AMZN",
  "QQQ",
  "GOOGL",
  "AMD",
  "COIN",
  "PLTR",
  "AVGO",
  "TSM",
  "NFLX",
  "ORCL",
  "SHOP",
  "CRWD",
  "COST",
  "MSTR",
];

/** Deterministic backdrop of drifting ticker columns; fills its nearest positioned ancestor. */
export default function TickerRain() {
  let rng = 5;
  const rand = () => {
    rng = (rng * 16807) % 2147483647;
    return rng / 2147483647;
  };
  const cols = Array.from({ length: 7 }, (_, i) => {
    const picked = Array.from(
      { length: 9 },
      () => SYMS[Math.floor(rand() * SYMS.length)],
    );
    const items = [...picked, ...picked].map((sym, j) => ({
      key: `${sym}-${j}`,
      sym,
      color:
        rand() < 0.08
          ? "color-mix(in srgb, var(--color-accent) 38%, transparent)"
          : `color-mix(in srgb, var(--color-ink) ${6 + Math.floor(rand() * 7)}%, transparent)`,
    }));
    return {
      items,
      anim: i % 2 ? "bq-col-down" : "bq-col-up",
      dur: `${(34 + rand() * 30).toFixed(0)}s`,
      size: `${22 + Math.floor(rand() * 22)}px`,
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
          className="h-full min-w-0 flex-1 overflow-hidden border-r border-ink/8"
        >
          <div
            className="mx-auto flex w-max flex-col"
            style={{ animation: `${c.anim} ${c.dur} linear infinite` }}
          >
            {c.items.map((it) => (
              <span
                key={it.key}
                className="whitespace-nowrap font-heading font-extrabold leading-[1.9] tracking-[-0.01em]"
                style={{ fontSize: c.size, color: it.color }}
              >
                {it.sym}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
