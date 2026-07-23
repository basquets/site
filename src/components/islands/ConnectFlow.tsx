import { type ApiAccess, BasquetsApi } from "@basquets/api-client";
import { useEffect, useRef, useState } from "react";
import { disconnect, requestLogin, switchToRobinhood } from "@/lib/wallet";
import { useHydrated } from "./use-hydrated";
import { useWallet } from "./use-wallet";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

type Role = "investor" | "curator";

const label = "block text-[11px] uppercase tracking-[0.1em] text-accent-700";
const sub = "text-[13.5px] leading-[21px] text-ink/65";
const btnPrimary =
  "cursor-pointer border border-transparent bg-accent px-3.5 py-2 text-left font-heading font-extrabold text-sm text-ground hover:bg-accent-600 active:bg-accent-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";
const btnGhost =
  "border border-divider px-3.5 py-2 font-heading font-extrabold text-ink text-sm no-underline hover:bg-ink/7 active:bg-ink/14";

/**
 * The real connect flow: Privy login through the navbar bridge, then the
 * connected wallet is registered on the waitlist and its live standing —
 * waitlisted place or allowlisted access — is read back from the API.
 */
export default function ConnectFlow() {
  const liveWallet = useWallet();
  const hydrated = useHydrated();
  // Hydration must mirror the server's disconnected markup (see use-hydrated).
  const wallet = hydrated
    ? liveWallet
    : ({ status: "disconnected", address: null, error: null } as const);
  const [role, setRole] = useState<Role>("investor");
  const [access, setAccess] = useState<ApiAccess | null>(null);
  const [apiError, setApiError] = useState(false);
  // One join per address; a re-render or a failed attempt must not double-POST.
  const joined = useRef<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "curator")
      setRole("curator");
  }, []);

  const address = wallet.address;
  useEffect(() => {
    if (!address || !API_URL || joined.current === address) return;
    joined.current = address;
    setApiError(false);
    new BasquetsApi(API_URL)
      .joinWaitlist({ address, role })
      .then(setAccess)
      .catch(() => {
        joined.current = null; // allow a retry
        setApiError(true);
      });
  }, [address, role]);

  const retry = () => {
    setApiError(false);
    setAccess(null);
    if (!address || !API_URL) return;
    joined.current = address;
    new BasquetsApi(API_URL)
      .joinWaitlist({ address, role })
      .then(setAccess)
      .catch(() => {
        joined.current = null;
        setApiError(true);
      });
  };

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <div className="border-2 border-ink bg-ground shadow-lg">
      {/* not connected yet: one door, Privy handles email, social, and wallets */}
      {wallet.status === "disconnected" && (
        <div className="p-[clamp(24px,3vw,36px)]">
          <span className={label}>Log in or sign up</span>
          <h2 className="mt-2.5 mb-0 font-heading font-extrabold text-[26px] tracking-[-0.015em]">
            {role === "curator"
              ? "Join the curator waitlist"
              : "Join the investor waitlist"}
          </h2>
          <p className={`mt-2.5 mb-5.5 ${sub}`}>
            Use an email, a social login, or a wallet you already have. Email
            and social create a self-custodied embedded wallet for you — no seed
            phrase, no extension.
          </p>
          <button
            type="button"
            className={`${btnPrimary} w-full py-3 text-center`}
            onClick={requestLogin}
          >
            Continue with Privy
          </button>
          {wallet.error && (
            <p className="mt-3 mb-0 text-[13px] text-red-900">{wallet.error}</p>
          )}
          <p className="mt-4.5 mb-0 flex items-center gap-2 text-[11px] leading-4 text-ink/45">
            <span className="inline-block size-2 flex-none bg-ink" />
            Protected by Privy · keys are yours, recoverable by email
          </p>
        </div>
      )}

      {wallet.status === "connecting" && (
        <div className="animate-panel-in p-[clamp(24px,3vw,36px)]">
          <span className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.1em] text-accent-700">
            <span className="size-2 bg-accent animate-pulse-live" />
            Connecting
          </span>
          <h2 className="mt-3 mb-0 font-heading font-extrabold text-[26px] tracking-[-0.015em]">
            Finish in the Privy window
          </h2>
          <p className={`mt-2.5 mb-0 ${sub}`}>
            Approve the login there; this page updates by itself.
          </p>
        </div>
      )}

      {(wallet.status === "connected" || wallet.status === "wrong-chain") && (
        <div className="animate-panel-in">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-divider px-6 py-3">
            <span className="text-[11px] uppercase tracking-[0.1em] text-ink/55 tnum">
              {short}
            </span>
            <button
              type="button"
              onClick={() => {
                joined.current = null;
                setAccess(null);
                disconnect();
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-[11px] uppercase tracking-[0.1em] text-accent-700 hover:text-accent-600"
            >
              Disconnect
            </button>
          </div>

          <div className="p-[clamp(24px,3vw,36px)]">
            {access?.status === "allowed" ? (
              <>
                <span className={label}>Access granted</span>
                <h2 className="mt-2.5 mb-0 font-heading font-extrabold text-[26px] tracking-[-0.015em]">
                  You're in. Welcome to the beta.
                </h2>
                <p className={`mt-2.5 mb-6 ${sub}`}>
                  This wallet is on the allowlist: every gated surface is open
                  to you.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="/create" className={`${btnPrimary} no-underline`}>
                    Create a basket
                  </a>
                  <a href="/studio" className={btnGhost}>
                    Open the studio
                  </a>
                  <a href="/baskets" className={btnGhost}>
                    Explore baskets
                  </a>
                </div>
              </>
            ) : access?.status === "waitlisted" ? (
              <>
                <span className={label}>
                  You're in line · {access.role ?? "investor"}
                </span>
                <p className="mt-3.5 mb-0 font-heading font-extrabold text-[clamp(52px,6vw,76px)] leading-none tracking-[-0.02em] tnum">
                  #{(access.position ?? 0).toLocaleString("en-US")}
                </p>
                <p className="mt-2.5 mb-6 text-[13px] text-ink/65 tnum">
                  of {access.total.toLocaleString("en-US")}{" "}
                  {access.total === 1 ? "wallet" : "wallets"} · the beta opens
                  wallet by wallet, top of the list first
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="/baskets" className={btnGhost}>
                    Browse baskets meanwhile
                  </a>
                </div>
              </>
            ) : apiError || !API_URL ? (
              <>
                <span className={label}>Wallet connected</span>
                <h2 className="mt-2.5 mb-0 font-heading font-extrabold text-[26px] tracking-[-0.015em]">
                  The waitlist is unreachable right now.
                </h2>
                <p className={`mt-2.5 mb-5 ${sub}`}>
                  Your wallet is connected; nothing is lost. Try again in a
                  moment.
                </p>
                {API_URL && (
                  <button type="button" className={btnPrimary} onClick={retry}>
                    Retry
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.1em] text-accent-700">
                  <span className="size-2 bg-accent animate-pulse-live" />
                  Securing your place
                </span>
                <p className={`mt-3 mb-0 ${sub}`}>
                  Registering this wallet on the waitlist…
                </p>
              </>
            )}

            {wallet.status === "wrong-chain" && (
              <p className="mt-5 mb-0 border-t-2 border-divider pt-4 text-[13px] leading-5 text-ink/65">
                Your wallet is on another network.{" "}
                <button
                  type="button"
                  onClick={switchToRobinhood}
                  className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-accent-700 underline hover:text-accent-600"
                >
                  Switch to Robinhood Chain
                </button>{" "}
                to use the app; your place in line is safe either way.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
