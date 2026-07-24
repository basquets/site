import { type ApiAccess, BasquetsApi } from "@basquets/api-client";
import {
  PrivyProvider,
  useConnectWallet,
  useLoginWithEmail,
  useLoginWithOAuth,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import React, { useEffect, useRef, useState } from "react";
import { robinhoodChain } from "../../lib/chain";
import { useHydrated } from "./use-hydrated";

const APP_ID = import.meta.env.PUBLIC_PRIVY_APP_ID as string | undefined;
const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

// Brand palette echoed into Privy's own UI (wallet-connect modal) so it reads
// like the warm coming-soon surface rather than the default Privy theme.
const CREAM = "#fcf6ef";
const GREEN = "#1f8a52";

const GoogleIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
);
const XIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.9 1.6h3.3l-7.2 8.2L23.7 22h-6.6l-5.2-6.8L5.9 22H2.6l7.7-8.8L2 1.6h6.8l4.7 6.2 5.4-6.2zm-1.2 18.4h1.8L7.1 3.4H5.2z" />
  </svg>
);
const MailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
const WalletIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
    <path d="M21 12v3h-4a1.5 1.5 0 0 1 0-3z" />
  </svg>
);

/** The email OTP flow, inline in our own warm UI (no Privy modal). */
function EmailForm({ onBack }: { onBack: () => void }) {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const codeSent =
    state.status === "awaiting-code-input" || state.status === "submitting-code";
  const busy = state.status === "sending-code" || state.status === "submitting-code";
  const error = state.status === "error" ? state.error?.message : null;

  return (
    <form
      className="cs-authform"
      onSubmit={(e) => {
        e.preventDefault();
        if (codeSent) void loginWithCode({ code });
        else if (email) void sendCode({ email });
      }}
    >
      {!codeSent ? (
        <input
          className="cs-authinput"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened
          autoFocus
          required
        />
      ) : (
        <>
          <p className="cs-authhint">
            We sent a 6-digit code to <b>{email}</b>.
          </p>
          <input
            className="cs-authinput"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            // biome-ignore lint/a11y/noAutofocus: move focus to the code field
            autoFocus
            required
          />
        </>
      )}

      {error && <p className="cs-autherr">{error}</p>}

      <button className="cs-authbtn cs-authbtn--primary" type="submit" disabled={busy}>
        {state.status === "sending-code"
          ? "Sending…"
          : state.status === "submitting-code"
            ? "Verifying…"
            : codeSent
              ? "Verify code"
              : "Send code"}
      </button>
      <button type="button" className="cs-authback" onClick={onBack}>
        ← Other options
      </button>
    </form>
  );
}

function SignIn() {
  const { initOAuth } = useLoginWithOAuth();
  const { connectWallet } = useConnectWallet();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [err, setErr] = useState<string | null>(null);

  if (mode === "email") return <EmailForm onBack={() => setMode("choose")} />;

  const oauth = (provider: "google" | "twitter") => {
    setErr(null);
    initOAuth({ provider }).catch((e) =>
      setErr(e instanceof Error ? e.message : "Sign-in failed — try again."),
    );
  };

  return (
    <div className="cs-authlist">
      <button className="cs-authbtn" type="button" onClick={() => oauth("google")}>
        {GoogleIcon}
        Continue with Google
      </button>
      <button className="cs-authbtn" type="button" onClick={() => oauth("twitter")}>
        {XIcon}
        Continue with X
      </button>
      <button className="cs-authbtn" type="button" onClick={() => setMode("email")}>
        {MailIcon}
        Continue with email
      </button>
      <div className="cs-authdiv">or</div>
      <button className="cs-authbtn" type="button" onClick={() => connectWallet()}>
        {WalletIcon}
        Connect a wallet
      </button>
      {err && <p className="cs-autherr">{err}</p>}
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
  const { ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? null;

  // Server + pre-hydration: always the sign-in buttons, so hydration matches.
  if (!hydrated || !authenticated) return <SignIn />;
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
    return <p className="cs-sub">Sign-in is not configured yet.</p>;
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
          // Warm brand skin for any Privy-rendered UI (e.g. wallet connect).
          appearance: {
            theme: CREAM,
            accentColor: GREEN,
            logo: "/favicon.svg",
            landingHeader: "Join the Basquets waitlist",
            showWalletLoginFirst: false,
            walletChainType: "ethereum-only",
          },
        }}
      >
        <Inner />
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}
