import { describe, expect, test } from "bun:test";
import {
  CURATOR_FLOW_RATE,
  CURATOR_SHARE,
  curatorEarnings,
  MINT_REDEEM_FEE,
  pct,
  STREAMING_FEE,
  STREAMING_FEE_LABEL,
  TREASURY_SHARE,
  ZAP_FEE,
} from "./protocol";

/**
 * The launch rates the deployed contract will carry, read out of its
 * constructor rather than restated here.
 *
 * The site is the only place these numbers are shown to a human, so it is the
 * place they are most likely to go stale: the contract moved its streaming fee
 * to zero and the site went on advertising 1.50% for months. Parsing the source
 * makes that specific failure impossible rather than merely unlikely.
 *
 * The contract lives in the basquets/contracts repo. Set FEE_CONTROLLER_SRC to
 * a local checkout's FeeController.sol to test against it; otherwise the test
 * reads the file from the public repo on GitHub.
 */
const FEE_CONTROLLER =
  process.env.FEE_CONTROLLER_SRC ??
  "https://raw.githubusercontent.com/basquets/contracts/main/src/core/FeeController.sol";

const source = FEE_CONTROLLER.startsWith("https://")
  ? await (await fetch(FEE_CONTROLLER)).text()
  : await Bun.file(FEE_CONTROLLER).text();

function bpsFromConstructor(field: string): number {
  // Matches the single `_rates = Rates({...})` assignment in the constructor.
  const assignment = source.match(/_rates\s*=\s*Rates\(\{([^}]*)\}\)/);
  if (!assignment)
    throw new Error(
      `no '_rates = Rates({...})' assignment found in ${FEE_CONTROLLER}`,
    );
  const found = assignment[1].match(new RegExp(`${field}\\s*:\\s*(\\d+)`));
  if (!found)
    throw new Error(`no '${field}' in the FeeController constructor rates`);
  return Number(found[1]);
}

describe("site rates match the FeeController constructor", () => {
  test.each([
    ["mintFeeBps", MINT_REDEEM_FEE],
    ["redeemFeeBps", MINT_REDEEM_FEE],
    ["streamingFeeBps", STREAMING_FEE],
    ["zapFeeBps", ZAP_FEE],
    ["curatorShareBps", CURATOR_SHARE],
  ] as const)("%s", (field, rate) => {
    expect(bpsFromConstructor(field)).toBe(Math.round(rate * 10_000));
  });

  // The regression that prompted this file: the contract ships 0, and every
  // basket page advertised 1.50% a year on TVL.
  test("the streaming fee is off at launch", () => {
    expect(STREAMING_FEE).toBe(0);
    expect(STREAMING_FEE_LABEL).toBe("0%");
  });

  test("shares split the whole fee", () => {
    expect(CURATOR_SHARE + TREASURY_SHARE).toBeCloseTo(1, 10);
  });

  test("the curator flow rate is their cut of one mint or redeem", () => {
    expect(CURATOR_FLOW_RATE).toBeCloseTo(0.0024, 10);
  });
});

describe("curatorEarnings", () => {
  // The numbers the calculator puts on screen, checked without a browser: the
  // island is client:visible and cannot be hydrated in a headless pane.
  test.each([
    [1_000_000, 2_400],
    [5_000_000, 12_000],
    [20_000_000, 48_000],
    [50_000_000, 120_000],
  ])("$%i of flow pays the curator $%i", (flow, expected) => {
    expect(curatorEarnings(flow)).toBeCloseTo(expected, 6);
  });

  // With the streaming fee off, this is the whole point: size alone pays nobody.
  test("a basket nobody mints or redeems pays nothing", () => {
    expect(curatorEarnings(0)).toBe(0);
  });
});

describe("pct", () => {
  test("drops a trailing .00 but keeps real decimals", () => {
    expect(pct(0)).toBe("0%");
    expect(pct(0.6)).toBe("60%");
    expect(pct(0.004)).toBe("0.40%");
    expect(pct(0.0025)).toBe("0.25%");
    expect(pct(0.015)).toBe("1.50%");
  });
});
