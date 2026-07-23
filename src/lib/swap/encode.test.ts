import { describe, expect, test } from "bun:test";
import { decodeAbiParameters, decodeFunctionData } from "viem";
import { USDG } from "../chain";
import {
  ACTIONS,
  buildV4Calldata,
  universalRouterAbi,
  V4_SWAP_COMMAND,
} from "./encode";

const TOK = "0x1111111111111111111111111111111111111111" as const; // < USDG, so currency0
const TOK2 = "0x9999999999999999999999999999999999999999" as const; // > USDG
const hop = {
  fee: 3000,
  tickSpacing: 60,
  hooks: "0x0000000000000000000000000000000000000000",
};

describe("buildV4Calldata", () => {
  test("single hop: V4_SWAP command wrapping swap+settle+take", () => {
    const data = buildV4Calldata({
      sellToken: USDG,
      buyToken: TOK,
      sellAmount: 100n,
      minBuyAmount: 42n,
      deadline: 1800n,
      hops: [hop],
    });
    const { functionName, args } = decodeFunctionData({
      abi: universalRouterAbi,
      data,
    });
    expect(functionName).toBe("execute");
    const [commands, inputs, deadline] = args as [
      string,
      readonly `0x${string}`[],
      bigint,
    ];
    expect(commands).toBe(V4_SWAP_COMMAND);
    expect(deadline).toBe(1800n);
    const [actions, params] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      inputs[0],
    );
    expect(actions).toBe(
      `0x${[ACTIONS.SWAP_EXACT_IN_SINGLE, ACTIONS.SETTLE_ALL, ACTIONS.TAKE_ALL].map((b) => b.toString(16).padStart(2, "0")).join("")}`,
    );
    expect(params.length).toBe(3);
    // TAKE_ALL carries the onchain minimum for the buy token
    const [takeCurrency, minOut] = decodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      params[2],
    );
    expect(takeCurrency.toLowerCase()).toBe(TOK.toLowerCase());
    expect(minOut).toBe(42n);
  });

  test("two hops use SWAP_EXACT_IN with a USDG-intermediate path", () => {
    const data = buildV4Calldata({
      sellToken: TOK,
      buyToken: TOK2,
      sellAmount: 100n,
      minBuyAmount: 7n,
      deadline: 1800n,
      hops: [hop, { ...hop, fee: 10000 }],
    });
    const { args } = decodeFunctionData({ abi: universalRouterAbi, data });
    const [, inputs] = args as readonly [
      string,
      readonly `0x${string}`[],
      bigint,
    ];
    const [actions] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      inputs[0],
    );
    expect(
      actions.startsWith(
        `0x${ACTIONS.SWAP_EXACT_IN.toString(16).padStart(2, "0")}`,
      ),
    ).toBe(true);
  });

  test("rejects hop counts other than 1 or 2", () => {
    expect(() =>
      buildV4Calldata({
        sellToken: USDG,
        buyToken: TOK,
        sellAmount: 1n,
        minBuyAmount: 1n,
        deadline: 1n,
        hops: [],
      }),
    ).toThrow();
  });
});
