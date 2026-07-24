import { type ApiAccess, BasquetsApi } from "@basquets/api-client";
import { useEffect, useRef, useState } from "react";
import { privyActions, usePrivyState } from "../../lib/privy-store";
import { useHydrated } from "./use-hydrated";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;
const APP_ID = import.meta.env.PUBLIC_PRIVY_APP_ID as string | undefined;

function SignIn() {
  return (
    <div className="cs-authlist">
      <button
        className="cs-authbtn cs-authbtn--primary cs-authbtn--big"
        type="button"
        onClick={() => privyActions()?.login()}
      >
        Continue with Privy
      </button>
      <p className="cs-authmeta">Google, X, email, or a wallet · secured by Privy — no seed phrase.</p>
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

export default function WaitlistFlow() {
  const hydrated = useHydrated();
  const { ready, authenticated, address } = usePrivyState();

  if (!APP_ID) return <p className="cs-sub">Sign-in is not configured yet.</p>;
  // Server + pre-hydration: always the sign-in button, so hydration matches.
  if (!hydrated || !authenticated) return <SignIn />;
  if (!ready || !address) return <p className="cs-sub">Finishing sign-in…</p>;
  return <Registered address={address} onSignOut={() => privyActions()?.logout()} />;
}
