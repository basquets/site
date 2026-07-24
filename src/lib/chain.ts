import { defineChain } from "viem";

// Robinhood Chain — the waitlist only needs this to configure Privy's embedded
// wallet (email/social logins mint one), so the definition is intentionally
// minimal. The app repo carries the full version with contract addresses.
const RPC_URL =
  (import.meta.env?.PUBLIC_RPC_URL as string | undefined) ??
  "https://rpc.mainnet.chain.robinhood.com";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});
