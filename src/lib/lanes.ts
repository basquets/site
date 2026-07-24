import type { SwapRail } from "@basquets/api-client";
import lifi from "../assets/venues/lifi.svg";
import oneinch from "../assets/venues/oneinch.svg";
import rialto from "../assets/venues/rialto.svg";
import uniswap from "../assets/venues/uniswap.svg";
import zerox from "../assets/venues/zerox.svg";

export type LaneKind = "amm" | "rfq" | "propamm";
export type LaneStatus = "live" | "soon";

export interface Lane {
  rail: SwapRail;
  name: string;
  kind: LaneKind;
  status: LaneStatus;
  logo: string;
}

export const LANES: Lane[] = [
  { rail: "v4", name: "Uniswap v4", kind: "amm", status: "live", logo: uniswap.src },
  { rail: "rialto", name: "Rialto", kind: "propamm", status: "live", logo: rialto.src },
  { rail: "lifi", name: "LI.FI", kind: "rfq", status: "live", logo: lifi.src },
  { rail: "zeroex", name: "0x", kind: "rfq", status: "soon", logo: zerox.src },
  { rail: "oneinch", name: "1inch", kind: "rfq", status: "soon", logo: oneinch.src },
];

export const laneByRail = (rail: string): Lane | undefined => LANES.find((l) => l.rail === rail);

export function railLabel(rail: string, hops: number | null): string {
  if (rail === "v4") return `Uniswap v4${hops === 2 ? " · via USDG" : ""}`;
  return laneByRail(rail)?.name ?? rail;
}

const KIND_ORDER: LaneKind[] = ["amm", "propamm", "rfq"];

export function groupLanes(): { kind: LaneKind; lanes: Lane[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, lanes: LANES.filter((l) => l.kind === kind) }));
}
