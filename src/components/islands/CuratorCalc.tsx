import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import {
  CURATOR_SHARE_LABEL,
  curatorEarnings,
  MINT_REDEEM_FEE,
  MINT_REDEEM_FEE_LABEL,
  STREAMING_FEE_LABEL,
  TREASURY_SHARE,
  TREASURY_SHARE_LABEL,
} from "@/lib/protocol";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Curator economics on the real protocol rates.
 *
 * The input is flow, not TVL, because the streaming fee ships at zero: a
 * curator is paid when someone enters or leaves the basket, and a basket that
 * nobody trades pays nothing however big it is. A TVL slider here would be the
 * same lie the 1.50% label was.
 */
export default function CuratorCalc() {
  const [flow, setFlow] = useState(5_000_000);
  const gross = flow * MINT_REDEEM_FEE;
  const share = curatorEarnings(flow);
  return (
    <div className="grid items-start gap-y-9 gap-x-[clamp(32px,5vw,80px)] lg:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)]">
      <div>
        <p className="m-0 max-w-[52ch] text-base leading-7">
          Your cut is {CURATOR_SHARE_LABEL} of every fee your basket generates:{" "}
          {MINT_REDEEM_FEE_LABEL} on each mint and each redeem. No payout
          thresholds, no invoicing, no platform discretion; it's a smart
          contract. Pick a year's flow through the basket to see your share:
        </p>
        <div className="mt-6">
          <p className="m-0 mb-2 text-[12px] uppercase tracking-[0.08em] text-ink/60">
            Minted and redeemed per year
          </p>
          <Segmented
            label="Minted and redeemed per year"
            value={String(flow)}
            onChange={(v) => setFlow(Number(v))}
            options={[1, 5, 20, 50].map((m) => ({
              value: String(m * 1_000_000),
              label: `$${m}M`,
            }))}
          />
          <p className="mt-5 mb-0 max-w-[48ch] text-[13px] leading-6 text-ink/60">
            The holding fee is {STREAMING_FEE_LABEL} at launch, so nothing
            accrues while people simply hold — which also means a basket earns
            you nothing until it moves. Rates are protocol-wide, readable
            onchain, changeable only through a 48-hour timelock, and hard-capped
            in code. Worked examples are in{" "}
            <a href="/docs/curators" className="text-accent-700">
              the curator docs
            </a>
            .
          </p>
        </div>
      </div>
      <div className="border-2 border-ink bg-ground p-7">
        <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-accent-700">
          Your share · {CURATOR_SHARE_LABEL} of the fee
        </p>
        <p className="mt-3.5 mb-0 font-heading font-extrabold text-[clamp(44px,4.6vw,64px)] tracking-[-0.02em] tnum">
          {fmt(share)}
        </p>
        <p className="mt-1 mb-0 text-[13px] text-ink/60 tnum">
          per year · {fmt(share / 12)} / month, claimable onchain
        </p>
        <hr className="my-5.5 h-0.5 border-0 bg-divider" />
        <div className="grid gap-2.5 text-[13.5px] tnum">
          <div className="flex justify-between gap-4">
            <span className="text-ink/60">
              Fee on flow · {MINT_REDEEM_FEE_LABEL}
            </span>
            <span>{fmt(gross)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink/60">
              Treasury share ({TREASURY_SHARE_LABEL})
            </span>
            <span>{fmt(gross * TREASURY_SHARE)}</span>
          </div>
          <div className="flex justify-between gap-4 font-heading font-extrabold">
            <span>Your share ({CURATOR_SHARE_LABEL})</span>
            <span className="text-accent-700">{fmt(share)}</span>
          </div>
        </div>
        <p className="mt-4.5 mb-0 text-[11.5px] leading-[17px] text-ink/50">
          Illustrative. Flow is every dollar minted plus every dollar redeemed,
          so a holder who buys in and later sells out is counted twice — once
          each way, as the contract charges it.
        </p>
      </div>
    </div>
  );
}
