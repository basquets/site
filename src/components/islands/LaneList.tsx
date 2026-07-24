import { groupLanes, LANES, type Lane } from "@/lib/lanes";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<Lane["kind"], string> = {
  amm: "AMM",
  propamm: "propAMM",
  rfq: "RFQ desk",
};

function Chip({ lane }: { lane: Lane }) {
  const soon = lane.status === "soon";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border-2 border-divider px-2.5 py-1 text-[13px]",
        soon && "text-ink/45",
      )}
    >
      <img
        src={lane.logo}
        alt=""
        width={18}
        height={18}
        className="rounded-[4px]"
      />
      {lane.name}
      {soon && (
        <span className="border border-divider px-1 text-[11px] leading-4">
          soon
        </span>
      )}
    </span>
  );
}

export default function LaneList({
  variant = "strip",
}: {
  variant?: "strip" | "grouped";
}) {
  if (variant === "grouped") {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-6">
        {groupLanes().map((g) => (
          <div key={g.kind}>
            <p className="m-0 mb-2.5 text-[11px] uppercase tracking-[0.1em] text-ink/55">
              {KIND_LABEL[g.kind]}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.lanes.map((l) => (
                <Chip key={l.rail} lane={l} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {LANES.map((l) => (
        <Chip key={l.rail} lane={l} />
      ))}
    </div>
  );
}
