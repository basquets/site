import { cn } from "@/lib/utils";
import { LANES, laneByRail, railLabel } from "@/lib/lanes";
import { type LaneRow, laneRows, shouldFallback } from "@/lib/live-lanes";
import LaneList from "./LaneList";
import TokenLogo from "./TokenLogo";
import { useQuote } from "./use-quote";

const USDG_1000 = "1000000000";
const DISPLAY_TAKER = "0x6b556b5f57f66960af47bff30ee1cbd3b504e4f6";

function Row({ row, buySym }: { row: LaneRow; buySym: string }) {
  const lane = laneByRail(row.rail);
  return (
    <li className={cn("flex items-center gap-2.5 border-2 px-3 py-2.5 text-[13px]", row.isBest ? "border-accent bg-accent-100" : "border-divider")}>
      {lane && <img src={lane.logo} alt="" width={20} height={20} className="rounded-[5px]" />}
      {row.isBest && <span className="bg-accent px-1.5 py-0.5 text-[11px] uppercase tracking-[0.06em] text-ground">best</span>}
      <span className={row.isBest ? "font-heading font-extrabold" : ""}>{railLabel(row.rail, row.hops)}</span>
      {lane && <span className="text-[11px] uppercase tracking-[0.08em] text-ink/45">{lane.kind === "amm" ? "AMM" : lane.kind === "propamm" ? "propAMM" : "RFQ"}</span>}
      <span className="flex-1" />
      {!row.isBest && <span className="text-ink/55 tnum">{row.deltaBps} bps</span>}
      <span className="tnum">{row.amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} {buySym}</span>
    </li>
  );
}

export default function LiveLanes({ sym }: { sym: string }) {
  const { status, quote } = useQuote("USDG", sym, USDG_1000, DISPLAY_TAKER, 50);
  const rows = quote ? laneRows(quote) : [];

  if (shouldFallback(status, rows.length)) {
    return (
      <div className="border-2 border-ink bg-ground p-5">
        <p className="m-0 mb-3 text-[13px] text-ink/70">We route {sym} across every venue.</p>
        <LaneList variant="strip" />
      </div>
    );
  }

  const liveCount = rows.length;
  const spreadBps = liveCount > 1 ? Math.abs(rows[rows.length - 1].deltaBps) : null;
  const buySym = quote?.buy.symbol ?? sym;

  return (
    <div className="border-2 border-ink bg-ground p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <TokenLogo sym={sym} size={26} />
        <div className="leading-tight">
          <p className="m-0 font-heading font-extrabold text-[15px]">Routing $1,000 into {sym}</p>
          <p className="m-0 text-[12px] text-ink/55">
            {status === "loading" ? "quoting…" : `${liveCount} of ${LANES.length} venues quoting${spreadBps !== null ? ` · best beats worst by ${spreadBps} bps` : ""}`}
          </p>
        </div>
      </div>
      {status === "loading" && liveCount === 0 ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {[0, 1, 2].map((i) => <li key={i} className="h-[42px] animate-pulse border-2 border-divider bg-surface" />)}
        </ul>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">{rows.map((r) => <Row key={r.rail} row={r} buySym={buySym} />)}</ul>
      )}
      <div className="mt-4 border-t-2 border-divider pt-3">
        <p className="m-0 mb-2 text-[12px] text-ink/55">We route across every venue</p>
        <LaneList variant="strip" />
      </div>
    </div>
  );
}
