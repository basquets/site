import { useCallback, useEffect, useState } from "react";
import { parseAbi } from "viem";
import { NATIVE_ETH } from "@/lib/chain";
import { publicClient } from "@/lib/wallet";

const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

/** Raw balances per token address for the connected account. Refreshes on
 *  demand (after swaps) rather than per block — this is a picker aid, not
 *  accounting. The zero address reads the native ETH balance. */
export function useBalances(
  account: `0x${string}` | null,
  tokenAddresses: string[],
) {
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: joined addresses are a content hash — a fresh array with equal contents must not recreate refresh
  const refresh = useCallback(async () => {
    if (!account || tokenAddresses.length === 0) return;
    const erc20Addresses = tokenAddresses.filter(
      (a) => a.toLowerCase() !== NATIVE_ETH,
    );
    const wantsNative = erc20Addresses.length !== tokenAddresses.length;
    const [results, native] = await Promise.all([
      publicClient.multicall({
        contracts: erc20Addresses.map((address) => ({
          address: address as `0x${string}`,
          abi: erc20,
          functionName: "balanceOf" as const,
          args: [account] as const,
        })),
      }),
      wantsNative ? publicClient.getBalance({ address: account }) : null,
    ]);
    const next: Record<string, bigint> = {};
    erc20Addresses.forEach((addr, i) => {
      const r = results[i];
      if (r.status === "success") next[addr.toLowerCase()] = r.result as bigint;
    });
    if (native !== null) next[NATIVE_ETH] = native;
    setBalances(next);
  }, [account, tokenAddresses.join(",")]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { balances, refresh };
}
