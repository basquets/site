import { defineChain } from "viem";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  contracts: {
    // Canonical singleton deployment, verified live on 4663 via eth_getCode
    // (2026-07-23). Without this entry viem's multicall() refuses to batch.
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
});

export const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
export const USDG_DECIMALS = 6;
// Verified by scripts/verify-v4-periphery.ts — keep in sync with services/api/src/market/periphery.ts.
export const UNIVERSAL_ROUTER =
  "0x8876789976dEcBfCbBbe364623C63652db8C0904" as const;
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
/** 0x AllowanceHolder (canonical deployment address on most chains). The executor
 *  max-approves only this spender; any other allowanceTarget gets an exact-amount
 *  approval so a misbehaving upstream can never win an unlimited allowance. */
export const ZEROEX_ALLOWANCE_HOLDER =
  "0x0000000000001fF3684f28c67538d4D072C22734" as const;
