import { type ApiAccess, BasquetsApi } from "@basquets/api-client";
import { useEffect, useRef, useState } from "react";
import { privyActions, usePrivyState } from "../../lib/privy-store";
import { useHydrated } from "./use-hydrated";

/** Eased count-up to `target`, so the queue number lands with a little life. */
function useCountUp(target: number, ms = 850): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    let startT = 0;
    const step = (t: number) => {
      if (!startT) startT = t;
      const p = Math.min((t - startT) / ms, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

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

  const pos = access?.status === "waitlisted" ? (access.position ?? 0) : 0;
  const shownPos = useCountUp(pos);

  return (
    <div className="cs-seat">
      <div className="cs-seat-top">
        <span className="cs-seat-addr">{short}</span>
        <button type="button" className="cs-seat-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      {access?.status === "allowed" ? (
        <div className="cs-seat-body">
          <span className="cs-seat-kicker">✦ Access granted</span>
          <p className="cs-seat-headline">You're in.</p>
          <p className="cs-seat-note">This wallet is on the allowlist — every gated surface is open to you.</p>
        </div>
      ) : access?.status === "waitlisted" ? (
        <div className="cs-seat-body">
          <span className="cs-seat-kicker">Your seat in Genesis</span>
          <p className="cs-seat-rank">
            <span className="cs-seat-hash">#</span>
            <span className="cs-seat-num">{shownPos.toLocaleString("en-US")}</span>
            <span className="cs-seat-of">/ {access.total.toLocaleString("en-US")}</span>
          </p>
          <div className="cs-seat-bar" aria-hidden="true">
            <span
              style={{
                width: `${
                  pos > 0
                    ? (shownPos / pos) *
                      Math.min(100, Math.max(8, ((access.total - pos + 1) / access.total) * 100))
                    : 8
                }%`,
              }}
            />
          </div>
          <p className="cs-seat-note">The beta opens wallet by wallet — top of the list first.</p>
        </div>
      ) : apiError || !API_URL ? (
        <div className="cs-seat-body">
          <p className="cs-seat-headline cs-seat-headline--sm">The waitlist is unreachable right now.</p>
          <p className="cs-seat-note">Your wallet is connected; nothing is lost. Try again in a moment.</p>
          {API_URL && (
            <button type="button" className="cs-pill cs-pill--ink" onClick={join} style={{ marginTop: "18px" }}>
              Retry
            </button>
          )}
        </div>
      ) : (
        <p className="cs-seat-note cs-seat-note--load">Securing your place…</p>
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
