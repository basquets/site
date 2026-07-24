import { type ApiAccess, BasquetsApi } from "@basquets/api-client";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import React, { useEffect, useRef, useState } from "react";
import { robinhoodChain } from "../../lib/chain";
import { useHydrated } from "./use-hydrated";

const APP_ID = import.meta.env.PUBLIC_PRIVY_APP_ID as string | undefined;
const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

/** The four Privy sign-in methods, rendered as the warm buttons. Each opens the
 *  Privy modal (`login`), which presents the method the user picked. */
const METHODS = [
  {
    key: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
      </svg>
    ),
  },
  {
    key: "twitter",
    label: "Continue with X",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 1.6h3.3l-7.2 8.2L23.7 22h-6.6l-5.2-6.8L5.9 22H2.6l7.7-8.8L2 1.6h6.8l4.7 6.2 5.4-6.2zm-1.2 18.4h1.8L7.1 3.4H5.2z" />
      </svg>
    ),
  },
  {
    key: "email",
    label: "Continue with email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
] as const;

const WALLET_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
    <path d="M21 12v3h-4a1.5 1.5 0 0 1 0-3z" />
  </svg>
);

function SignIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="cs-authlist">
      {METHODS.map((m) => (
        <button key={m.key} className="cs-authbtn" type="button" onClick={onLogin}>
          {m.icon}
          {m.label}
        </button>
      ))}
      <div className="cs-authdiv">or</div>
      <button className="cs-authbtn" type="button" onClick={onLogin}>
        {WALLET_ICON}
        Connect a wallet
      </button>
    </div>
  );
}

/** Registers the connected wallet on the waitlist and reads its standing back. */
function Registered({ address, onSignOut }: { address: string; onSignOut: () => void }) {
  const [access, setAccess] = useState<ApiAccess | null>(null);
  const [apiError, setApiError] = useState(false);
  const joined = useRef<string | null>(null);
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  const join = () => {
    if (!API_URL) {
      setApiError(true);
      return;
    }
    setApiError(false);
    joined.current = address;
    new BasquetsApi(API_URL)
      .joinWaitlist({ address })
      .then(setAccess)
      .catch(() => {
        joined.current = null; // allow a retry
        setApiError(true);
      });
  };

  useEffect(() => {
    if (joined.current === address) return;
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="cs-join-result">
      <div className="cs-join-signed">
        <span className="cs-join-addr">{short}</span>
        <button type="button" className="cs-join-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      {access?.status === "allowed" ? (
        <>
          <span className="cs-tag cs-tag--ghost">Access granted</span>
          <p className="cs-join-status-h">You're in. Welcome to the beta.</p>
          <p className="cs-sub">This wallet is on the allowlist — every gated surface is open to you.</p>
        </>
      ) : access?.status === "waitlisted" ? (
        <>
          <span className="cs-tag cs-tag--ghost">You're in line</span>
          <p className="cs-join-place">#{(access.position ?? 0).toLocaleString("en-US")}</p>
          <p className="cs-sub">
            of {access.total.toLocaleString("en-US")} {access.total === 1 ? "wallet" : "wallets"} · the beta opens wallet by
            wallet, top of the list first.
          </p>
        </>
      ) : apiError || !API_URL ? (
        <>
          <span className="cs-tag">Wallet connected</span>
          <p className="cs-join-status-h">The waitlist is unreachable right now.</p>
          <p className="cs-sub">Your wallet is connected; nothing is lost. Try again in a moment.</p>
          {API_URL && (
            <button type="button" className="cs-pill cs-pill--ink" onClick={join}>
              Retry
            </button>
          )}
        </>
      ) : (
        <p className="cs-sub">Securing your place on the waitlist…</p>
      )}
    </div>
  );
}

function Inner() {
  const hydrated = useHydrated();
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? null;

  // Server + pre-hydration: always the sign-in buttons, so hydration matches.
  if (!hydrated || !authenticated) return <SignIn onLogin={login} />;
  if (!ready || !address) return <p className="cs-sub">Finishing sign-in…</p>;
  return <Registered address={address} onSignOut={logout} />;
}

/** A Privy init failure must not blank the page — fall back to a note. */
class PrivyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[waitlist] Privy failed to initialize:", err);
  }
  render() {
    return this.state.failed ? (
      <p className="cs-sub">Sign-in is unavailable right now — please try again shortly.</p>
    ) : (
      this.props.children
    );
  }
}

export default function WaitlistFlow() {
  if (!APP_ID) {
    // No Privy config: render the static buttons so the page still looks right.
    return <SignIn onLogin={() => {}} />;
  }
  return (
    <PrivyErrorBoundary>
      <PrivyProvider
        appId={APP_ID}
        config={{
          // Must match the methods enabled in the Privy dashboard.
          loginMethods: ["email", "google", "twitter", "wallet"],
          defaultChain: robinhoodChain,
          supportedChains: [robinhoodChain],
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
          },
        }}
      >
        <Inner />
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}
