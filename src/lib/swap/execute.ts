import { parseAbi } from "viem";
import { PERMIT2, UNIVERSAL_ROUTER, ZEROEX_ALLOWANCE_HOLDER } from "../chain";
import { publicClient, walletClient } from "../wallet";
import { buildV4Calldata } from "./encode";
import type { SwapExecutor, SwapIntent, SwapResult } from "./intent";

const erc20 = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
]);
const permit2Abi = parseAbi([
  "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

const MAX_UINT256 = 2n ** 256n - 1n;
const MAX_UINT160 = 2n ** 160n - 1n;

async function waitFor(hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`transaction reverted: ${hash}`);
  return receipt;
}

/** Trusted spenders get a one-time MAX approval; untrusted ones (exact: true)
 *  get exactly `needed` so a misbehaving upstream can never win an unlimited
 *  allowance — at the cost of re-approving on every swap. */
async function ensureErc20Allowance(
  owner: `0x${string}`,
  token: `0x${string}`,
  spender: `0x${string}`,
  needed: bigint,
  opts: { exact?: boolean } = {},
) {
  const current = await publicClient.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (current >= needed) return;
  const hash = await walletClient().writeContract({
    address: token,
    abi: erc20,
    functionName: "approve",
    args: [spender, opts.exact ? needed : MAX_UINT256],
  });
  await waitFor(hash);
  const after = await publicClient.readContract({
    address: token,
    abi: erc20,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (after < needed)
    throw new Error(
      "approval did not take effect — the token may require resetting the allowance to 0 first",
    );
}

async function ensurePermit2Allowance(
  owner: `0x${string}`,
  token: `0x${string}`,
  needed: bigint,
) {
  await ensureErc20Allowance(owner, token, PERMIT2, needed);
  const [amount, expiration] = await publicClient.readContract({
    address: PERMIT2,
    abi: permit2Abi,
    functionName: "allowance",
    args: [owner, token, UNIVERSAL_ROUTER],
  });
  const now = Math.floor(Date.now() / 1000);
  if (amount >= needed && expiration > now + 60) return;
  const hash = await walletClient().writeContract({
    address: PERMIT2,
    abi: permit2Abi,
    functionName: "approve",
    args: [token, UNIVERSAL_ROUTER, MAX_UINT160, now + 30 * 24 * 3600],
  });
  await waitFor(hash);
}

/** Rejects intents whose quote does not describe the same trade. Runs before
 *  any wallet or RPC access so it is unit-testable and fails fast. */
function assertIntentMatchesQuote(intent: SwapIntent) {
  if (
    intent.sellToken.toLowerCase() !== intent.quote.sell.address.toLowerCase()
  )
    throw new Error("intent sellToken does not match the quoted sell token");
  if (intent.buyToken.toLowerCase() !== intent.quote.buy.address.toLowerCase())
    throw new Error("intent buyToken does not match the quoted buy token");
  if (intent.sellAmount.toString() !== intent.quote.sell.amount)
    throw new Error("intent sellAmount does not match the quoted sell amount");
  if (intent.deadline <= BigInt(Math.floor(Date.now() / 1000)))
    throw new Error("swap deadline is already past");
}

async function settle(
  intent: SwapIntent,
  owner: `0x${string}`,
  hash: `0x${string}`,
  before: bigint,
): Promise<SwapResult> {
  await waitFor(hash);
  const after = await publicClient.readContract({
    address: intent.buyToken,
    abi: erc20,
    functionName: "balanceOf",
    args: [owner],
  });
  return { txHash: hash, received: after - before };
}

const buyBalance = (intent: SwapIntent, owner: `0x${string}`) =>
  publicClient.readContract({
    address: intent.buyToken,
    abi: erc20,
    functionName: "balanceOf",
    args: [owner],
  });

/** v1 transport: the connected EOA signs and pays gas. The relayer executor
 *  slots in behind the same SwapExecutor type later. */
export const walletExecutor: SwapExecutor = async (
  intent: SwapIntent,
): Promise<SwapResult> => {
  assertIntentMatchesQuote(intent);
  const owner = walletClient().account.address;

  const rail = intent.quote.rails.find((r) => r.rail === intent.quote.best);
  if (!rail) throw new Error("quote has no best rail");

  if (rail.rail === "zeroex") {
    if (!rail.tx)
      throw new Error(
        "0x quote is indicative — re-quote with a taker before executing",
      );
    const spender = rail.tx.allowanceTarget as `0x${string}`;
    const pinned =
      spender.toLowerCase() === ZEROEX_ALLOWANCE_HOLDER.toLowerCase();
    await ensureErc20Allowance(
      owner,
      intent.sellToken,
      spender,
      intent.sellAmount,
      { exact: !pinned },
    );
    // Read immediately before the swap so approval waits never widen the diff window.
    const before = await buyBalance(intent, owner);
    const hash = await walletClient().sendTransaction({
      to: rail.tx.to as `0x${string}`,
      data: rail.tx.data as `0x${string}`,
      value: BigInt(rail.tx.value),
    });
    return settle(intent, owner, hash, before);
  }

  if (!rail.hops) throw new Error("v4 quote is missing hops");
  await ensurePermit2Allowance(owner, intent.sellToken, intent.sellAmount);
  const before = await buyBalance(intent, owner);
  const hash = await walletClient().sendTransaction({
    to: UNIVERSAL_ROUTER,
    data: buildV4Calldata({
      sellToken: intent.sellToken,
      buyToken: intent.buyToken,
      sellAmount: intent.sellAmount,
      minBuyAmount: intent.minBuyAmount,
      deadline: intent.deadline,
      hops: rail.hops,
    }),
  });
  return settle(intent, owner, hash, before);
};
