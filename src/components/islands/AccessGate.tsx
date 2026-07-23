import { BasquetsApi } from "@basquets/api-client";
import { useEffect, useState } from "react";
import { hasFlag } from "@/lib/flags";
import CreateStudio from "./CreateStudio";
import ManagePanel from "./ManagePanel";
import StudioPanel from "./StudioPanel";
import { useWallet } from "./use-wallet";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

const PANELS = {
  studio: StudioPanel,
  manage: ManagePanel,
  create: CreateStudio,
} as const;

export type GatedPage = keyof typeof PANELS;

/**
 * Renders a gated page only for allowlisted wallets: the connected address is
 * checked against the beta_access whitelist via GET /v1/access. Feature flags
 * remain as a local dev/preview override only.
 * Used with client:only so locked content never lands in the static HTML.
 */
export default function AccessGate({ page }: { page: GatedPage }) {
  const wallet = useWallet();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const address = wallet.address;
  useEffect(() => {
    if (hasFlag(page)) {
      setAllowed(true);
      return;
    }
    if (wallet.status === "connecting") {
      setAllowed(null); // Privy is still resolving; don't flash the locked card
      return;
    }
    // wrong-chain still identifies the wallet — the whitelist is chain-agnostic
    if (!address || !API_URL) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    setAllowed(null);
    new BasquetsApi(API_URL)
      .access(address)
      .then((a) => {
        if (!cancelled) setAllowed(a.status === "allowed");
      })
      .catch(() => {
        // An unreachable API locks the door rather than opening it.
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, wallet.status, address]);

  if (allowed === null) return null;

  if (!allowed) {
    const connected = !!address;
    return (
      <div className="flex justify-center py-[calc(3*28px)]">
        <div className="w-full max-w-[520px] border-2 border-ink bg-ground p-[clamp(24px,3vw,36px)] shadow-lg">
          <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-700">
            Restricted · private beta
          </span>
          <h1 className="mt-3 mb-0 font-heading font-extrabold text-[28px] tracking-[-0.015em]">
            {connected
              ? "This wallet isn't on the allowlist yet."
              : "This area opens with the whitelist."}
          </h1>
          <p className="mt-3 mb-0 text-sm leading-6 text-ink/75">
            {connected
              ? "The beta opens wallet by wallet. Your place in line is held; check your standing or come back when your wallet is allowlisted."
              : "The curator tools are enabled wallet by wallet during the private beta. Join the whitelist to hold your place, or read about the curator program; we unlock access as wallets are confirmed."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/connect?role=curator"
              className="border border-transparent bg-accent px-3.5 py-2 font-heading font-extrabold text-ground text-sm no-underline hover:bg-accent-600 active:translate-y-px"
            >
              {connected ? "Check your place in line" : "Connect wallet"}
            </a>
            <a
              href="/curators"
              className="border border-divider px-3.5 py-2 font-heading font-extrabold text-ink text-sm no-underline hover:bg-ink/7"
            >
              The curator program
            </a>
          </div>
        </div>
      </div>
    );
  }

  const Panel = PANELS[page];
  return <Panel />;
}
