import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import React, { useEffect } from "react";
import { robinhoodChain } from "../../lib/chain";
import {
  setPrivyActions,
  setPrivySnapshot,
  usePrivyState,
} from "../../lib/privy-store";
import { useHydrated } from "./use-hydrated";

const APP_ID = import.meta.env.PUBLIC_PRIVY_APP_ID as string | undefined;

const CREAM = "#fcf6ef";
const GREEN = "#1f8a52";

/** Syncs the one Privy context into the shared store and registers the
 *  login/logout actions the WaitlistFlow island calls. Renders nothing. */
function Bridge() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? null;

  useEffect(() => {
    setPrivyActions({ login: () => login(), logout });
  }, [login, logout]);

  useEffect(() => {
    setPrivySnapshot({ ready, authenticated, address });
  }, [ready, authenticated, address]);

  return null;
}

const JoinPill = () => (
  <a href="/join" className="cs-pill cs-pill--ink">
    Join waitlist
  </a>
);

/** The nav pill: "Join waitlist" when logged out, the connected wallet when in. */
function Pill() {
  const hydrated = useHydrated();
  const { authenticated, address } = usePrivyState();
  if (!hydrated || !authenticated) return <JoinPill />;
  const short = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Account";
  return (
    <a
      href="/join"
      className="cs-pill cs-pill--acct"
      title="You're on the waitlist"
    >
      <span className="cs-pill-dot" aria-hidden="true" />
      {short}
    </a>
  );
}

/** A Privy init failure must not break the nav — fall back to the plain pill. */
class PrivyNavBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[nav] Privy failed to initialize:", err);
  }
  render() {
    return this.state.failed ? <JoinPill /> : this.props.children;
  }
}

export default function PrivyNav() {
  if (!APP_ID) return <JoinPill />;
  return (
    <PrivyNavBoundary>
      <PrivyProvider
        appId={APP_ID}
        config={{
          loginMethods: ["email", "google", "twitter", "wallet"],
          defaultChain: robinhoodChain,
          supportedChains: [robinhoodChain],
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
          appearance: {
            theme: CREAM,
            accentColor: GREEN,
            logo: "/favicon.svg",
            landingHeader: "Join the Basquets waitlist",
            loginMessage: "Social, email, or a wallet — no seed phrase.",
            showWalletLoginFirst: false,
            walletChainType: "ethereum-only",
            walletList: [
              "detected_wallets",
              "metamask",
              "coinbase_wallet",
              "wallet_connect",
              "rainbow",
            ],
          },
        }}
      >
        <Bridge />
        <Pill />
      </PrivyProvider>
    </PrivyNavBoundary>
  );
}
