// Single source of truth for protocol fee rates shown anywhere on the site.
//
// These mirror the launch defaults in the `FeeController` constructor
// (contracts/src/core/FeeController.sol). They are not copied by hand and hoped
// for: protocol.test.ts parses that constructor and fails if these drift from
// it, which is how a stale 1.50% survived here after the contract moved to 0.
//
// Once FeeController is deployed (docs/addresses.mdx still lists it as
// pre-launch) these become the fallback and the live rates come from the chain
// via the API, since the real contract can be re-rated through a 48-hour
// timelock.

/** Streaming fee, yearly on TVL. Zero at launch — see docs/fees.mdx. */
export const STREAMING_FEE = 0;
/** Mint and redeem fee, each. */
export const MINT_REDEEM_FEE = 0.004;
/** Zap fee on the USDG leg (100% to the treasury). */
export const ZAP_FEE = 0.0025;
/** Curator's share of every basket fee (mint, redeem, streaming). */
export const CURATOR_SHARE = 0.6;
/** Treasury's share of every basket fee. */
export const TREASURY_SHARE = 1 - CURATOR_SHARE;

/**
 * What a curator actually earns per dollar that enters or leaves their basket.
 *
 * With the streaming fee at zero this is the whole curator economy: a basket
 * that nobody mints or redeems pays its curator nothing, however large it is.
 */
export const CURATOR_FLOW_RATE = MINT_REDEEM_FEE * CURATOR_SHARE;

/**
 * What a curator keeps out of `flowUsd` — every dollar minted plus every dollar
 * redeemed, since the contract charges both directions.
 *
 * The three surfaces that quote curator earnings (the calculator, the studio
 * shelf, the create flow) all went through this, so none of them can drift from
 * the fee model on its own the way the hardcoded rates did.
 */
export function curatorEarnings(flowUsd: number): number {
  return flowUsd * CURATOR_FLOW_RATE;
}

/** A rate as a percentage, without a trailing `.00` on whole numbers. */
export function pct(rate: number): string {
  return `${(rate * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

export const STREAMING_FEE_LABEL = pct(STREAMING_FEE);
export const MINT_REDEEM_FEE_LABEL = pct(MINT_REDEEM_FEE);
export const ZAP_FEE_LABEL = pct(ZAP_FEE);
export const CURATOR_FLOW_RATE_LABEL = pct(CURATOR_FLOW_RATE);
export const CURATOR_SHARE_LABEL = pct(CURATOR_SHARE);
export const TREASURY_SHARE_LABEL = pct(TREASURY_SHARE);
