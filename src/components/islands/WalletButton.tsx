import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import React, { useEffect } from "react";
import type { EIP1193Provider } from "viem";
import { robinhoodChain } from "@/lib/chain";
import {
  registerBridgeActions,
  setBridgeState,
  switchToRobinhood,
} from "@/lib/wallet";
import { mapBridgeState, parseCaipChainId } from "@/lib/wallet-state";
import { useWallet } from "./use-wallet";

const APP_ID = import.meta.env.PUBLIC_PRIVY_APP_ID as string | undefined;

/** Syncs Privy into the shared walletStore and executes cross-island action
 *  requests. Renders nothing. */
function PrivyBridge() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const active = wallets[0] ?? null;

  useEffect(
    () =>
      registerBridgeActions({
        login,
        logout,
        switchChain: async () => {
          await active?.switchChain(robinhoodChain.id);
        },
      }),
    [login, logout, active],
  );

  useEffect(() => {
    const mapped = mapBridgeState({
      ready,
      authenticated,
      address: active?.address ?? null,
      chainId: parseCaipChainId(active?.chainId),
    });
    if (
      !active ||
      mapped.status === "disconnected" ||
      mapped.status === "connecting"
    ) {
      setBridgeState(mapped, null);
      return;
    }
    let cancelled = false;
    active.getEthereumProvider().then((p) => {
      if (!cancelled) setBridgeState(mapped, p as EIP1193Provider);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, active, active?.chainId]);

  return null;
}

const buttonBase =
  "inline-flex items-center bg-accent px-3.5 py-2 font-heading font-extrabold text-sm text-ground hover:bg-accent-600 active:bg-accent-700 active:translate-y-px";

function ButtonUi() {
  const wallet = useWallet();

  if (wallet.status === "connecting")
    return (
      <button type="button" className={`${buttonBase} opacity-60`} disabled>
        Connecting…
      </button>
    );
  if (wallet.status === "wrong-chain")
    return (
      <button type="button" className={buttonBase} onClick={switchToRobinhood}>
        Switch network
      </button>
    );
  // Disconnected: the button is a link — every connect entry point funnels to
  // /connect, where the ConnectFlow island drives the actual Privy login.
  if (wallet.status !== "connected" || !wallet.address)
    return (
      <a href="/connect" className={`${buttonBase} no-underline`}>
        Connect wallet
      </a>
    );

  // Connected: the chip is the door to the portfolio page, which also carries
  // the copy/explorer/disconnect actions the old dropdown held.
  const short = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;
  return (
    <a href="/portfolio" className={`${buttonBase} no-underline tnum`}>
      {short}
    </a>
  );
}

function UnavailableButton({ reason }: { reason: string }) {
  return (
    <button
      type="button"
      className={`${buttonBase} opacity-50`}
      disabled
      title={reason}
    >
      Connect wallet
    </button>
  );
}

/** Spec: a Privy init failure (bad app id, network) degrades to the disabled
 *  button with the error logged — the rest of the site must keep working. */
class PrivyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[wallet] Privy failed to initialize:", err);
  }
  render() {
    return this.state.failed ? (
      <UnavailableButton reason="Wallet unavailable — initialization failed" />
    ) : (
      this.props.children
    );
  }
}

export default function WalletButton() {
  if (!APP_ID)
    return (
      <UnavailableButton reason="Wallet unavailable — missing app configuration" />
    );
  return (
    <PrivyErrorBoundary>
      <PrivyProvider
        appId={APP_ID}
        config={{
          // Must stay in sync with the methods enabled in the Privy dashboard:
          // requesting a disabled one makes the modal render empty.
          loginMethods: ["email", "google", "twitter", "wallet"],
          defaultChain: robinhoodChain,
          supportedChains: [robinhoodChain],
          // v3 nests embedded-wallet creation per chain (verified against 3.35.1 types)
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        <PrivyBridge />
        <ButtonUi />
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}
