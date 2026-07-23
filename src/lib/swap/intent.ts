import type { ApiQuote } from "@basquets/api-client";

/** What the user agreed to. Same philosophy as the zap intent: user-signed
 *  bounds with a swappable transport underneath (walletExecutor today,
 *  relayerExecutor later). Enforcement differs by rail: on the v4 rail,
 *  minBuyAmount and deadline are contract-enforced (amountOutMinimum /
 *  execute deadline in the Universal Router calldata we build). On the 0x
 *  rail the calldata comes pre-built from 0x, so the onchain bound is the
 *  slippageBps baked into the quote — the same tolerance the user picked at
 *  quote time, forwarded through the API. */
export interface SwapIntent {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: bigint;
  minBuyAmount: bigint; // buyAmount * (1 - slippageTolerance), enforced onchain
  deadline: bigint; // unix seconds
  quote: ApiQuote; // the quote the user reviewed (carries rail + hops/tx)
}

export interface SwapResult {
  txHash: `0x${string}`;
  received: bigint; // actual buy-token delta, measured by balance diff
}

export type SwapExecutor = (intent: SwapIntent) => Promise<SwapResult>;
