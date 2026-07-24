import { describe, expect, test } from "bun:test";
import { monogram, resolveTokenLogo } from "./token-logo";

describe("token-logo", () => {
  const manifest = { AAPL: "/_astro/aapl.abc.svg", NVDA: "/_astro/nvda.def.svg" };
  test("resolveTokenLogo returns the asset url when present (case-insensitive)", () => {
    expect(resolveTokenLogo("aapl", manifest)).toBe("/_astro/aapl.abc.svg");
    expect(resolveTokenLogo("NVDA", manifest)).toBe("/_astro/nvda.def.svg");
  });
  test("resolveTokenLogo returns null when missing", () => {
    expect(resolveTokenLogo("TSLA", manifest)).toBeNull();
  });
  test("monogram takes the first two alphanumerics, uppercased", () => {
    expect(monogram("aapl")).toBe("AA");
    expect(monogram("x")).toBe("X");
    expect(monogram("BRK.B")).toBe("BR");
  });
});
