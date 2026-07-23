import {
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  type EIP1193Provider,
  http,
} from "viem";
import { robinhoodChain } from "./chain";
import type { MappedWallet } from "./wallet-state";

export interface WalletState {
  status: "disconnected" | "connecting" | "wrong-chain" | "connected";
  address: Address | null;
  error: string | null;
}

let state: WalletState = { status: "disconnected", address: null, error: null };
// The EIP-1193 provider of the active Privy wallet (external extension or the
// embedded wallet). Set exclusively by the PrivyBridge.
let activeProvider: EIP1193Provider | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const set = (next: Partial<WalletState>) => {
  state = { ...state, ...next };
  emit();
};

export const walletStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot: () => state,
};

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(undefined, { batch: { batchSize: 25 } }),
});

export function walletClient() {
  if (!activeProvider || !state.address)
    throw new Error("wallet not connected");
  return createWalletClient({
    chain: robinhoodChain,
    account: state.address,
    transport: custom(activeProvider),
  });
}

/** Called by the PrivyBridge whenever Privy state changes. */
export function setBridgeState(
  mapped: MappedWallet,
  provider: EIP1193Provider | null,
): void {
  activeProvider = provider;
  set({
    status: mapped.status,
    address: (mapped.address as Address) ?? null,
    error: null,
  });
}

// Cross-island signals: any island can request wallet actions; only the
// navbar's PrivyBridge (which owns the Privy context) can execute them.
export interface BridgeActions {
  login(): void | Promise<void>;
  logout(): void | Promise<void>;
  switchChain(): void | Promise<void>;
}

let actions: BridgeActions | null = null;

export function registerBridgeActions(a: BridgeActions): () => void {
  actions = a;
  return () => {
    if (actions === a) actions = null;
  };
}

export function requestLogin(): void {
  if (!actions) {
    set({ error: "Wallet is unavailable right now — try reloading the page." });
    return;
  }
  void actions.login();
}

export function disconnect(): void {
  Promise.resolve(actions?.logout()).catch(() => {}); // a failed logout leaves state as-is
}

export function switchToRobinhood(): void {
  // Dismissing the wallet's network-switch prompt rejects; state stays
  // wrong-chain and the user can simply retry — not an error worth surfacing.
  Promise.resolve(actions?.switchChain()).catch(() => {});
}
