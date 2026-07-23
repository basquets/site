import { useEffect, useState } from "react";

/** Regular NYSE session, Mon-Fri 9:30-16:00 ET. Holidays are not modeled. */
function marketOpenNow(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  if (day === "Sat" || day === "Sun") return false;
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

/**
 * Compact status chip that sits at the end of the ticker strip.
 * Renders nothing while US markets are open.
 */
export default function MarketStatus() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setOpen(marketOpenNow());
    update();
    const iv = setInterval(update, 60_000);
    return () => clearInterval(iv);
  }, []);
  if (open !== false) return null;
  return (
    <div
      className="flex flex-none items-center gap-2.5 border-l-2 border-divider bg-surface px-4"
      title="Prices are frozen at the last close and minting is paused until the next US market open. Transfers never stop."
    >
      <span className="size-2 flex-none bg-accent animate-pulse-live" />
      <span className="whitespace-nowrap font-heading font-extrabold text-[11px] uppercase tracking-[0.08em]">
        US markets closed
      </span>
      <span className="hidden whitespace-nowrap text-[12px] text-ink/70 xl:inline">
        Transfers never stop.
      </span>
    </div>
  );
}
