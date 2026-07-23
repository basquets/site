import { describe, expect, test } from "bun:test";
import type { ApiQuote } from "@basquets/api-client";
import { USDG } from "../chain";
import { walletExecutor } from "./execute";
import type { SwapIntent } from "./intent";

const TOK = "0x1111111111111111111111111111111111111111" as const;
const OTHER = "0x2222222222222222222222222222222222222222" as const;
const FUTURE = BigInt(Math.floor(Date.now() / 1000) + 3600);

function quote(over: Partial<ApiQuote> = {}): ApiQuote {
  return {
    sell: { address: USDG, symbol: "USDG", decimals: 6, amount: "1000000" },
    buy: { address: TOK, symbol: "NVDA", decimals: 18 },
    mid: null,
    impact: null,
    depth: null,
    rails: [
      {
        rail: "v4",
        buyAmount: "5000000000000000000",
        gasEstimate: 150000,
        hops: [
          {
            fee: 3000,
            tickSpacing: 60,
            hooks: "0x0000000000000000000000000000000000000000",
          },
        ],
        tx: null,
      },
    ],
    best: "v4",
    fetchedAt: new Date().toISOString(),
    ...over,
  };
}

function intent(over: Partial<SwapIntent> = {}): SwapIntent {
  return {
    sellToken: USDG,
    buyToken: TOK,
    sellAmount: 1_000_000n,
    minBuyAmount: 4_900_000_000_000_000_000n,
    deadline: FUTURE,
    quote: quote(),
    ...over,
  };
}

// The consistency guards run before any wallet/RPC access, so a mismatched
// intent must throw its specific error without a connected wallet.
describe("walletExecutor intent guards", () => {
  test("rejects a sellToken that differs from the quoted sell", async () => {
    await expect(walletExecutor(intent({ sellToken: OTHER }))).rejects.toThrow(
      "intent sellToken does not match the quoted sell token",
    );
  });

  test("rejects a buyToken that differs from the quoted buy", async () => {
    await expect(walletExecutor(intent({ buyToken: OTHER }))).rejects.toThrow(
      "intent buyToken does not match the quoted buy token",
    );
  });

  test("rejects a sellAmount that differs from the quoted amount", async () => {
    await expect(
      walletExecutor(intent({ sellAmount: 2_000_000n })),
    ).rejects.toThrow(
      "intent sellAmount does not match the quoted sell amount",
    );
  });

  test("rejects an already-past deadline", async () => {
    await expect(walletExecutor(intent({ deadline: 1n }))).rejects.toThrow(
      "swap deadline is already past",
    );
  });

  test("address casing differences alone do not trip the guards", async () => {
    // Passing the guards means execution reaches the wallet, which is not
    // connected in tests — so the failure must be the wallet, not a guard.
    await expect(
      walletExecutor(
        intent({ sellToken: USDG.toLowerCase() as `0x${string}` }),
      ),
    ).rejects.toThrow("wallet not connected");
  });
});
