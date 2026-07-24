import { describe, expect, test } from "bun:test";
import { LANES, groupLanes, laneByRail, railLabel } from "./lanes";

describe("lanes", () => {
  test("has the five integrated lanes, live ones first", () => {
    expect(LANES.map((l) => l.rail)).toEqual(["v4", "rialto", "lifi", "zeroex", "oneinch"]);
    expect(LANES.filter((l) => l.status === "live").map((l) => l.rail)).toEqual(["v4", "rialto", "lifi"]);
    expect(LANES.filter((l) => l.status === "soon").map((l) => l.rail)).toEqual(["zeroex", "oneinch"]);
  });
  test("laneByRail resolves known rails and returns undefined otherwise", () => {
    expect(laneByRail("rialto")?.name).toBe("Rialto");
    expect(laneByRail("nope")).toBeUndefined();
  });
  test("railLabel names each lane; a two-hop v4 notes the USDG bridge", () => {
    expect(railLabel("v4", 1)).toBe("Uniswap v4");
    expect(railLabel("v4", 2)).toBe("Uniswap v4 · via USDG");
    expect(railLabel("zeroex", null)).toBe("0x");
    expect(railLabel("oneinch", null)).toBe("1inch");
    expect(railLabel("lifi", null)).toBe("LI.FI");
    expect(railLabel("rialto", null)).toBe("Rialto");
    expect(railLabel("mystery", null)).toBe("mystery");
  });
  test("groupLanes buckets by kind in AMM, propAMM, RFQ order", () => {
    const groups = groupLanes();
    expect(groups.map((g) => g.kind)).toEqual(["amm", "propamm", "rfq"]);
    expect(groups.find((g) => g.kind === "rfq")?.lanes.map((l) => l.rail)).toEqual(["lifi", "zeroex", "oneinch"]);
  });
});
