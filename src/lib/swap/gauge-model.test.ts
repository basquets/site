import { describe, expect, test } from "bun:test";
import { gaugeModel } from "./gauge-model";

const depth = { greenMaxUsd: 2800, yellowMaxUsd: 9000 };

describe("gaugeModel", () => {
  test("green zone: marker inside the first 52% band, reassuring verdict", () => {
    const m = gaugeModel(depth, 1000, 0.0018);
    expect(m.zone).toBe("green");
    expect(m.markerPct).toBeCloseTo((1000 / 2800) * 52, 1);
    expect(m.verdict).toContain("$2,800");
    expect(m.verdict).toContain("0.18%");
  });
  test("yellow zone maps between 52% and 78%", () => {
    const m = gaugeModel(depth, 5000, 0.011);
    expect(m.zone).toBe("yellow");
    expect(m.markerPct).toBeGreaterThan(52);
    expect(m.markerPct).toBeLessThan(78);
  });
  test("red zone caps at 100 and warns with the dollar cost", () => {
    const m = gaugeModel(depth, 20000, 0.031);
    expect(m.zone).toBe("red");
    expect(m.markerPct).toBeLessThanOrEqual(100);
    expect(m.verdict).toContain("$620"); // 20000 * 0.031
  });
  test("no depth data degrades gracefully", () => {
    const m = gaugeModel(null, 1000, null);
    expect(m.zone).toBe("unknown");
    expect(m.verdict.length).toBeGreaterThan(0);
  });
});
