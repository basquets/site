import type { ApiQuote } from "@basquets/api-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { robinhoodChain } from "@/lib/chain";
import { fmtFeeTier } from "@/lib/format";
import type { SwapResult } from "@/lib/swap/intent";
import { minBuyAmount } from "@/lib/swap/min-buy";

const QUOTE_TTL_S = 15;
const fmt = (raw: string | bigint, decimals: number, dp = 6) =>
  Number(formatUnits(BigInt(raw), decimals)).toLocaleString("en-US", {
    maximumFractionDigits: dp,
  });

/** A failed signing returns to "review" (with the error banner kept in its own
 *  state) so the countdown and the expiry re-quote keep running — there is no
 *  terminal failed phase to strand a stale price in. */
export type ReviewPhase = "review" | "signing" | "done";

/** Sentinel compared at render time so the gas error gets a real docs link
 *  instead of a path pasted into prose. */
const GAS_ERROR = "Not enough ETH to pay for gas.";

function friendlyError(msg: string): string {
  if (/reverted/.test(msg))
    return "The price moved past your slippage tolerance, so the swap cancelled itself. Nothing was lost; re-quote and try again.";
  if (/insufficient funds/i.test(msg)) return GAS_ERROR;
  if (/denied|rejected/i.test(msg)) return "Signature rejected in the wallet.";
  return msg;
}

export default function ReviewSheet({
  quote,
  slippage,
  quoteLoading,
  onSlippage,
  onRequote,
  onConfirm,
  onClose,
}: {
  quote: ApiQuote;
  slippage: number; // fraction, e.g. 0.005
  quoteLoading: boolean; // a re-quote is in flight; the shown numbers may be superseded
  onSlippage: (f: number) => void;
  onRequote: () => Promise<void>;
  onConfirm: (minBuyAmount: bigint, deadline: bigint) => Promise<SwapResult>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<ReviewPhase>("review");
  const [left, setLeft] = useState(QUOTE_TTL_S);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // When this quote arrived, by the client clock — the countdown measures the
  // price's real age, so a signing detour does not grant a stale quote a
  // fresh 15 seconds.
  // biome-ignore lint/correctness/useExhaustiveDependencies: quote.fetchedAt is the cache key — each new quote stamps a new arrival time
  const receivedAt = useMemo(() => Date.now(), [quote.fetchedAt]);
  useEffect(() => {
    if (phase !== "review") return;
    const compute = () =>
      QUOTE_TTL_S - Math.round((Date.now() - receivedAt) / 1000);
    setLeft(compute());
    const t = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(t);
  }, [phase, receivedAt]);

  // Stale price never gets signed: at expiry request a fresh quote, once per
  // quote instance; a new fetchedAt resets the timer above.
  const requotedFor = useRef<string | null>(null);
  useEffect(() => {
    if (left > 0 || phase !== "review") return;
    if (requotedFor.current === quote.fetchedAt) return;
    requotedFor.current = quote.fetchedAt;
    void onRequote();
  }, [left, phase, quote.fetchedAt, onRequote]);

  // Dialog basics: focus Cancel on open, give focus back on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => prev?.focus();
  }, []);

  // Escape closes (never mid-signing); Tab cycles inside the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "signing") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = containerRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href]",
      );
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  const best = quote.rails.find((r) => r.rail === quote.best);
  if (!best) return null;
  const buyAmount = BigInt(best.buyAmount);
  const minBuy = minBuyAmount(buyAmount, slippage);

  const row = (label: string, value: string, bold = false) => (
    <div className="flex items-baseline justify-between py-1 text-[13px]">
      <span className="text-ink/60">{label}</span>
      <span className={`tnum ${bold ? "font-heading font-extrabold" : ""}`}>
        {value}
      </span>
    </div>
  );

  const confirm = async () => {
    setPhase("signing");
    setError(null);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      setResult(await onConfirm(minBuy, deadline));
      setPhase("done");
    } catch (e) {
      setError(friendlyError((e as Error).message));
      setPhase("review");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm swap"
    >
      <div
        ref={containerRef}
        className="w-full max-w-sm border-2 border-ink bg-ground"
      >
        <div className="flex items-baseline justify-between border-b-2 border-divider px-5 py-3">
          <span className="text-[11px] uppercase tracking-[0.1em] text-ink/55">
            Confirm swap
          </span>
          {phase === "review" && (
            <span className="text-[11px] uppercase tracking-[0.1em] text-accent-700 tnum">
              {quoteLoading
                ? "updating price…"
                : `price valid ${Math.max(0, left)}s`}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="m-0 flex items-baseline justify-between font-heading text-[18px] font-extrabold tnum">
            <span>
              {fmt(quote.sell.amount, quote.sell.decimals)} {quote.sell.symbol}
            </span>
            <span aria-hidden="true" className="text-accent-700">
              →
            </span>
            <span>
              {fmt(buyAmount, quote.buy.decimals)} {quote.buy.symbol}
            </span>
          </p>
          <div className="mt-3 border-t-2 border-dashed border-divider pt-2">
            {row(
              "Route",
              best.rail === "zeroex"
                ? "0x RFQ"
                : `Uniswap v4${best.hops?.length === 2 ? " · via USDG" : ""}`,
            )}
            {best.rail === "zeroex" && row("Route fee", "Included in price")}
            {best.hops?.length === 1 &&
              row("Pool fee", fmtFeeTier(best.hops[0].fee))}
            {best.hops?.length === 2 &&
              row(
                "Pool fees",
                `${fmtFeeTier(best.hops[0].fee)} + ${fmtFeeTier(best.hops[1].fee)}`,
              )}
            {quote.impact != null &&
              row("Price impact", `${(quote.impact * 100).toFixed(2)}%`)}
            {best.gasEstimate != null &&
              row(
                "Gas (est.)",
                `${best.gasEstimate.toLocaleString("en-US")} units`,
              )}
            <div className="flex items-baseline justify-between py-1 text-[13px]">
              <span className="text-ink/60">Slippage tolerance</span>
              <span className="flex gap-1">
                {[0.001, 0.005, 0.01].map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={phase !== "review"}
                    onClick={() => onSlippage(f)}
                    className={`border-2 px-1.5 text-[11px] tnum disabled:cursor-not-allowed disabled:opacity-45 ${slippage === f ? "border-ink bg-ink text-ground" : "border-divider"}`}
                  >
                    {(f * 100).toFixed(1)}%
                  </button>
                ))}
              </span>
            </div>
          </div>
          <div className="mt-2 border-t-2 border-dashed border-divider pt-2">
            {row(
              "Minimum received",
              `${fmt(minBuy, quote.buy.decimals)} ${quote.buy.symbol}`,
              true,
            )}
            <p className="mt-1 mb-0 text-[12px] leading-5 text-ink/60">
              Enforced onchain: if the price moves past your tolerance the
              transaction cancels itself and you lose nothing.
            </p>
          </div>

          {phase === "done" && result && (
            <div className="mt-3 border-2 border-emerald-700 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
              Received {fmt(result.received, quote.buy.decimals)}{" "}
              {quote.buy.symbol}.{" "}
              <a
                href={`${robinhoodChain.blockExplorers.default.url}/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                View transaction
              </a>
            </div>
          )}
          {phase !== "done" && error && (
            <div className="mt-3 border-2 border-red-700 bg-red-50 px-3 py-2 text-[13px] text-red-900">
              {error === GAS_ERROR ? (
                <>
                  {GAS_ERROR} See the{" "}
                  <a href="/docs" className="underline">
                    docs
                  </a>{" "}
                  for getting ETH on Robinhood Chain.
                </>
              ) : (
                error
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {phase !== "done" ? (
              <>
                <Button
                  className="flex-1"
                  onClick={confirm}
                  disabled={phase === "signing" || left <= 0 || quoteLoading}
                >
                  {phase === "signing"
                    ? "Waiting for wallet…"
                    : "Sign in wallet"}
                </Button>
                <Button
                  ref={cancelRef}
                  variant="secondary"
                  onClick={onClose}
                  disabled={phase === "signing"}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button className="flex-1" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
