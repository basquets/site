import { robinhoodChain } from "./chain";

/** What the PrivyBridge observes each render, reduced to plain data so the
 *  status mapping is testable without the SDK. */
export interface BridgeSnapshot {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
  chainId: number | null;
}

export interface MappedWallet {
  status: "connecting" | "disconnected" | "wrong-chain" | "connected";
  address: string | null;
}

/** Privy wallet.chainId is CAIP-2 ("eip155:4663"). */
export function parseCaipChainId(
  caip: string | undefined | null,
): number | null {
  if (!caip) return null;
  const m = /^eip155:(\d+)$/.exec(caip);
  return m ? Number(m[1]) : null;
}

export function mapBridgeState(s: BridgeSnapshot): MappedWallet {
  if (!s.ready) return { status: "connecting", address: null };
  if (!s.authenticated) return { status: "disconnected", address: null };
  // Authenticated with no wallet: the embedded wallet is still provisioning.
  if (!s.address) return { status: "connecting", address: null };
  // Unknown chain maps to wrong-chain — prompting a switch to 4663 is a safe
  // no-op when the wallet is already there.
  return {
    status: s.chainId === robinhoodChain.id ? "connected" : "wrong-chain",
    address: s.address,
  };
}
