import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  parseAbi,
} from "viem";
import { USDG } from "../chain";

/**
 * Universal Router command + v4-periphery action ids (v4-periphery Actions.sol).
 *
 * Robinhood Chain's router is a FORK of v4-periphery, not the canonical build:
 * its swap param structs carry an extra `minHopPriceX36` field (per-hop price
 * floor; 0 / empty array disables the check — verified in the router's
 * Blockscout-verified V4Router.sol, 2026-07-23). Canonical Uniswap encodings
 * revert in abi.decode, which is why every struct below includes the field.
 */
export const V4_SWAP_COMMAND = "0x10";
export const ACTIONS = {
  SWAP_EXACT_IN_SINGLE: 0x06,
  SWAP_EXACT_IN: 0x07,
  SETTLE_ALL: 0x0c,
  TAKE_ALL: 0x0f,
} as const;

export const universalRouterAbi = parseAbi([
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) payable",
]);

export interface EncodeHop {
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface EncodeArgs {
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: bigint;
  minBuyAmount: bigint;
  deadline: bigint;
  hops: EncodeHop[];
}

const poolKeyComponents = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export function buildV4Calldata(a: EncodeArgs): `0x${string}` {
  let actions: `0x${string}`;
  let swapParams: `0x${string}`;

  if (a.hops.length === 1) {
    const h = a.hops[0];
    const token =
      a.sellToken.toLowerCase() === USDG.toLowerCase()
        ? a.buyToken
        : a.sellToken;
    const tokenIsCurrency0 = token.toLowerCase() < USDG.toLowerCase();
    const [currency0, currency1] = tokenIsCurrency0
      ? [token, USDG]
      : [USDG, token];
    const zeroForOne = a.sellToken.toLowerCase() === currency0.toLowerCase();
    actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [ACTIONS.SWAP_EXACT_IN_SINGLE, ACTIONS.SETTLE_ALL, ACTIONS.TAKE_ALL],
    );
    swapParams = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "poolKey", type: "tuple", components: poolKeyComponents },
            { name: "zeroForOne", type: "bool" },
            { name: "amountIn", type: "uint128" },
            { name: "amountOutMinimum", type: "uint128" },
            { name: "minHopPriceX36", type: "uint256" },
            { name: "hookData", type: "bytes" },
          ],
        },
      ],
      [
        {
          poolKey: {
            currency0,
            currency1,
            fee: h.fee,
            tickSpacing: h.tickSpacing,
            hooks: h.hooks as `0x${string}`,
          },
          zeroForOne,
          amountIn: a.sellAmount,
          amountOutMinimum: a.minBuyAmount,
          // 0 disables the fork's per-hop price floor; amountOutMinimum is the guarantee
          minHopPriceX36: 0n,
          hookData: "0x",
        },
      ],
    );
  } else if (a.hops.length === 2) {
    actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [ACTIONS.SWAP_EXACT_IN, ACTIONS.SETTLE_ALL, ACTIONS.TAKE_ALL],
    );
    const pathKey = (intermediate: `0x${string}`, h: EncodeHop) => ({
      intermediateCurrency: intermediate,
      fee: h.fee,
      tickSpacing: h.tickSpacing,
      hooks: h.hooks as `0x${string}`,
      hookData: "0x" as `0x${string}`,
    });
    swapParams = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "currencyIn", type: "address" },
            {
              name: "path",
              type: "tuple[]",
              components: [
                { name: "intermediateCurrency", type: "address" },
                { name: "fee", type: "uint24" },
                { name: "tickSpacing", type: "int24" },
                { name: "hooks", type: "address" },
                { name: "hookData", type: "bytes" },
              ],
            },
            { name: "minHopPriceX36", type: "uint256[]" },
            { name: "amountIn", type: "uint128" },
            { name: "amountOutMinimum", type: "uint128" },
          ],
        },
      ],
      [
        {
          currencyIn: a.sellToken,
          path: [pathKey(USDG, a.hops[0]), pathKey(a.buyToken, a.hops[1])],
          // empty disables the fork's per-hop price floors; amountOutMinimum is the guarantee
          minHopPriceX36: [],
          amountIn: a.sellAmount,
          amountOutMinimum: a.minBuyAmount,
        },
      ],
    );
  } else {
    throw new Error(`unsupported hop count: ${a.hops.length}`);
  }

  const settle = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [a.sellToken, a.sellAmount],
  );
  const take = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [a.buyToken, a.minBuyAmount],
  );
  const input = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [swapParams, settle, take]],
  );
  return encodeFunctionData({
    abi: universalRouterAbi,
    functionName: "execute",
    args: [V4_SWAP_COMMAND, [input], a.deadline],
  });
}
