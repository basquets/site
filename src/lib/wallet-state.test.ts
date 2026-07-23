import { describe, expect, test } from "bun:test";
import { mapBridgeState, parseCaipChainId } from "./wallet-state";

describe("parseCaipChainId", () => {
  test("parses eip155 ids and rejects garbage", () => {
    expect(parseCaipChainId("eip155:4663")).toBe(4663);
    expect(parseCaipChainId("eip155:1")).toBe(1);
    expect(parseCaipChainId(undefined)).toBeNull();
    expect(parseCaipChainId("solana:mainnet")).toBeNull();
  });
});

describe("mapBridgeState", () => {
  const addr = "0x1111111111111111111111111111111111111111";
  test("sdk not ready -> connecting", () => {
    expect(
      mapBridgeState({
        ready: false,
        authenticated: false,
        address: null,
        chainId: null,
      }).status,
    ).toBe("connecting");
  });
  test("ready but unauthenticated -> disconnected", () => {
    expect(
      mapBridgeState({
        ready: true,
        authenticated: false,
        address: null,
        chainId: null,
      }).status,
    ).toBe("disconnected");
  });
  test("authenticated but no wallet yet -> connecting (embedded wallet still provisioning)", () => {
    expect(
      mapBridgeState({
        ready: true,
        authenticated: true,
        address: null,
        chainId: null,
      }).status,
    ).toBe("connecting");
  });
  test("wallet on 4663 -> connected with address", () => {
    const s = mapBridgeState({
      ready: true,
      authenticated: true,
      address: addr,
      chainId: 4663,
    });
    expect(s).toEqual({ status: "connected", address: addr });
  });
  test("wallet on another chain -> wrong-chain, address kept", () => {
    const s = mapBridgeState({
      ready: true,
      authenticated: true,
      address: addr,
      chainId: 1,
    });
    expect(s).toEqual({ status: "wrong-chain", address: addr });
  });
  test("unknown chain id -> wrong-chain (switch prompt is a safe no-op)", () => {
    expect(
      mapBridgeState({
        ready: true,
        authenticated: true,
        address: addr,
        chainId: null,
      }).status,
    ).toBe("wrong-chain");
  });
});
