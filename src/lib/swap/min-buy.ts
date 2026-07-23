/** The onchain minimum received for a quoted buy amount at a slippage
 *  tolerance (fraction, e.g. 0.005). Scaled through 1e6 with a floor so the
 *  bound only ever rounds in the user's favor conservatively — never above
 *  what the tolerance promises. */
export function minBuyAmount(buyAmount: bigint, slippage: number): bigint {
  return (
    (buyAmount * BigInt(Math.floor((1 - slippage) * 1_000_000))) / 1_000_000n
  );
}
