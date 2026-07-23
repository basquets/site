import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { NATIVE_ETH, USDG } from "@/lib/chain";
import { fmtFeeTier } from "@/lib/format";
import { walletExecutor } from "@/lib/swap/execute";
import { gaugeModel } from "@/lib/swap/gauge-model";
import type { SwapIntent } from "@/lib/swap/intent";
import { switchToRobinhood } from "@/lib/wallet";
import DepthGauge from "./DepthGauge";
import MarketMovers from "./MarketMovers";
import ReviewSheet from "./ReviewSheet";
import RouteCard from "./RouteCard";
import TokenFactsCard from "./TokenFactsCard";
import TokenSelect, { type TokenOption, toOptions } from "./TokenSelect";
import { useBalances } from "./use-balances";
import { useHydrated } from "./use-hydrated";
import { tokenChange, useTokenMarket } from "./use-live-market";
import { useQuote } from "./use-quote";
import { useWallet } from "./use-wallet";

const label = "m-0 text-[11px] uppercase tracking-[0.1em] text-ink/55";

export default function SwapPanel() {
  const market = useTokenMarket();
  const liveWallet = useWallet();
  const hydrated = useHydrated();
  // The hydration render must match the server's disconnected markup; the
  // real status takes over one effect-tick later.
  const wallet = hydrated
    ? liveWallet
    : ({ status: "disconnected", address: null, error: null } as const);
  const options = useMemo(() => toOptions(market.tokens), [market.tokens]);
  const usdgOption = options[0];

  const [sell, setSell] = useState<TokenOption>(usdgOption);
  const [buy, setBuy] = useState<TokenOption | null>(null);
  const [amountText, setAmountText] = useState("");
  const [picker, setPicker] = useState<"sell" | "buy" | null>(null);
  const [slippage, setSlippage] = useState(0.005);
  const [redZoneOk, setRedZoneOk] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);

  const rawAmount = useMemo(() => {
    try {
      return amountText
        ? parseUnits(amountText as `${number}`, sell.decimals).toString()
        : "";
    } catch {
      return "";
    }
  }, [amountText, sell.decimals]);

  const tokenAddresses = useMemo(
    () => options.map((o) => o.address),
    [options],
  );
  const { balances, refresh } = useBalances(wallet.address, tokenAddresses);
  const q = useQuote(
    sell.address,
    buy?.address ?? null,
    rawAmount,
    wallet.address,
    Math.round(slippage * 10_000),
    quoteNonce,
  );

  // One Escape handler for both pickers.
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicker(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);

  // A failed re-quote nulls q.quote and unmounts the sheet; without this the
  // next successful quote would pop the modal back open uninvited, bypassing
  // the ready gate.
  useEffect(() => {
    if (reviewing && !q.quote) setReviewing(false);
  }, [reviewing, q.quote]);

  // Stock options render at 18 decimals until a quote reports the onchain
  // truth; sync the selection so parseUnits builds the right raw amount.
  useEffect(() => {
    const quote = q.quote;
    if (!quote) return;
    setSell((s) =>
      quote.sell.address.toLowerCase() === s.address.toLowerCase() &&
      quote.sell.decimals !== s.decimals
        ? { ...s, decimals: quote.sell.decimals }
        : s,
    );
    setBuy((b) =>
      b &&
      quote.buy.address.toLowerCase() === b.address.toLowerCase() &&
      quote.buy.decimals !== b.decimals
        ? { ...b, decimals: quote.buy.decimals }
        : b,
    );
  }, [q.quote]);

  // USD size for the gauge: USDG sells are 1:1; stock sells price via the market store.
  const amountUsd = useMemo(() => {
    const n = Number(amountText || 0);
    if (sell.address === USDG) return n;
    const px = market.hist[sell.symbol]?.at(-1) ?? 0;
    return n * px;
  }, [amountText, sell, market.hist]);
  const gauge = q.quote
    ? gaugeModel(q.quote.depth, amountUsd, q.quote.impact)
    : null;

  const sellBalance = balances[sell.address.toLowerCase()];
  const insufficient =
    sellBalance !== undefined &&
    rawAmount !== "" &&
    BigInt(rawAmount) > sellBalance;
  const needsRedZoneAck = gauge?.zone === "red" && !redZoneOk;
  const ready =
    wallet.status === "connected" &&
    q.status === "ready" &&
    q.quote !== null &&
    !insufficient &&
    !needsRedZoneAck;

  const bestOut = q.quote
    ? q.quote.rails.find((r) => r.rail === q.quote?.best)
    : null;

  const requote = useCallback(async () => setQuoteNonce((n) => n + 1), []);

  // Fee shorthand for the one-line summary: v4 sums the hop fees, 0x bakes
  // the maker's spread into the quoted price.
  const feeSuffix = bestOut
    ? bestOut.rail === "zeroex"
      ? " · RFQ"
      : bestOut.hops?.length
        ? ` · fee ${fmtFeeTier(bestOut.hops.reduce((a, h) => a + h.fee, 0))}`
        : ""
    : "";

  const buyFacts = buy ? market.tokens[buy.symbol] : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
      <div className="border-2 border-ink bg-ground shadow-lg">
        <div className="flex items-baseline justify-between border-b-2 border-divider px-6 py-3">
          <span className={label}>Swap</span>
          {wallet.status === "connected" && wallet.address ? (
            <span className={`${label} tnum`}>
              {`${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}
            </span>
          ) : (
            <a
              href="/connect"
              className="text-[11px] uppercase tracking-[0.1em] text-accent-700 no-underline hover:text-accent-600"
            >
              Not connected
            </a>
          )}
        </div>

        <div className="relative border-b-2 border-divider px-6 py-5">
          <p className={label}>You sell</p>
          <div className="mt-2 flex items-baseline gap-3">
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value.replace(/[^0-9.]/g, ""));
                setRedZoneOk(false);
              }}
              className="w-full border-0 bg-transparent p-0 font-heading text-[30px] font-extrabold outline-none tnum"
              aria-label={`Amount of ${sell.symbol} to sell`}
            />
            <Button
              variant="secondary"
              className="shrink-0 whitespace-nowrap border-2 border-ink"
              aria-haspopup="listbox"
              aria-expanded={picker === "sell"}
              onClick={() => setPicker(picker === "sell" ? null : "sell")}
            >
              {sell.symbol}
              <span className="text-[10px] text-ink/50" aria-hidden="true">
                ▼
              </span>
            </Button>
          </div>
          {amountText !== "" && rawAmount === "" && (
            <p className="mt-1.5 mb-0 text-[12px] text-red-900">
              Enter a valid amount.
            </p>
          )}
          <p className="mt-1.5 mb-0 flex items-baseline justify-between gap-3 text-[12px] text-ink/60 tnum">
            <span className="min-w-0 truncate">
              {[
                sellBalance !== undefined
                  ? `Balance: ${Number(formatUnits(sellBalance, sell.decimals)).toLocaleString("en-US", { maximumFractionDigits: 4 })}`
                  : "",
                sell.address !== USDG && amountUsd > 0
                  ? `≈ $${amountUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {sellBalance !== undefined && sellBalance > 0n && (
              <button
                type="button"
                className="border border-divider px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink/70 hover:bg-accent-100 hover:text-ink active:translate-y-px"
                onClick={() => {
                  // Selling native ETH keeps a sliver back for the gas the
                  // swap itself needs; MAX-ing to zero would strand the tx.
                  const gasReserve = 5_000_000_000_000_000n; // 0.005 ETH
                  const spendable =
                    sell.address === NATIVE_ETH
                      ? sellBalance > gasReserve
                        ? sellBalance - gasReserve
                        : 0n
                      : sellBalance;
                  setAmountText(formatUnits(spendable, sell.decimals));
                }}
              >
                Max
              </button>
            )}
          </p>
          <TokenSelect
            open={picker === "sell"}
            options={options}
            balances={balances}
            exclude={buy?.address ?? null}
            onPick={(o) => {
              setSell(o);
              setRedZoneOk(false);
            }}
            onClose={() => setPicker(null)}
          />
        </div>

        <div className="flex justify-center border-b-2 border-divider py-2">
          <button
            type="button"
            aria-label="Flip direction"
            disabled={!buy}
            className="flex size-8 items-center justify-center border-2 border-ink bg-ground font-heading text-base font-extrabold text-accent-700 hover:bg-accent-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => {
              if (buy) {
                setSell(buy);
                setBuy(sell);
                setAmountText("");
              }
            }}
          >
            ⇅
          </button>
        </div>

        <div className="relative border-b-2 border-divider px-6 py-5">
          <p className={label}>You receive (estimated)</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p
              className={`m-0 w-full font-heading text-[30px] font-extrabold tnum ${bestOut && q.quote ? "" : "text-ink/30"}`}
            >
              {bestOut && q.quote
                ? Number(
                    formatUnits(
                      BigInt(bestOut.buyAmount),
                      q.quote.buy.decimals,
                    ),
                  ).toLocaleString("en-US", { maximumFractionDigits: 6 })
                : "0.00"}
            </p>
            <Button
              variant="secondary"
              className="shrink-0 whitespace-nowrap border-2 border-ink"
              aria-haspopup="listbox"
              aria-expanded={picker === "buy"}
              onClick={() => setPicker(picker === "buy" ? null : "buy")}
            >
              {buy?.symbol ?? "Select"}
              <span className="text-[10px] text-ink/50" aria-hidden="true">
                ▼
              </span>
            </Button>
          </div>
          {q.quote?.mid != null && buy && (
            <p className="mt-1.5 mb-0 text-[12px] text-ink/60 tnum">
              1 {buy.symbol} ≈{" "}
              {(1 / q.quote.mid).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}{" "}
              {sell.symbol}
            </p>
          )}
          <TokenSelect
            open={picker === "buy"}
            options={options}
            balances={balances}
            exclude={sell.address}
            onPick={(o) => {
              setBuy(o);
              setRedZoneOk(false);
            }}
            onClose={() => setPicker(null)}
          />
        </div>

        <div className="px-6 py-4">
          {q.quote?.impact != null && (
            <p className="m-0 mb-3 flex justify-between text-[12px] text-ink/60 tnum">
              <span>
                Impact {(q.quote.impact * 100).toFixed(2)}%{feeSuffix}
              </span>
              <span>
                {q.quote.rails.length} route
                {q.quote.rails.length > 1 ? "s" : ""} quoted
              </span>
            </p>
          )}
          {insufficient && (
            <p className="m-0 mb-3 border-2 border-red-700 bg-red-50 px-3 py-2 text-[13px] text-red-900">
              Insufficient {sell.symbol} balance.
            </p>
          )}
          {q.status === "error" && (
            <p className="m-0 mb-3 border-2 border-amber-600 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              {q.error}
            </p>
          )}
          {gauge?.zone === "red" && (
            <label className="m-0 mb-3 flex items-start gap-2 border-2 border-red-700 bg-red-50 px-3 py-2 text-[13px] text-red-900">
              <input
                type="checkbox"
                checked={redZoneOk}
                onChange={(e) => setRedZoneOk(e.target.checked)}
                className="mt-0.5"
              />
              I understand this trade is large for the pool and accept the price
              impact.
            </label>
          )}
          {wallet.error && (
            <p className="m-0 mb-3 text-[13px] text-red-900">{wallet.error}</p>
          )}

          {wallet.status !== "connected" ? (
            wallet.status === "disconnected" ? (
              <Button asChild className="w-full">
                <a href="/connect">Connect wallet</a>
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={switchToRobinhood}
                disabled={wallet.status === "connecting"}
              >
                {wallet.status === "connecting"
                  ? "Connecting…"
                  : "Switch to Robinhood Chain"}
              </Button>
            )
          ) : (
            <Button
              className="w-full"
              disabled={!ready}
              onClick={() => setReviewing(true)}
            >
              {q.status === "loading" ? "Quoting…" : "Review swap"}
            </Button>
          )}
          <p className="mt-2 mb-0 text-center text-[12px] text-ink/55">
            No surprises: you see everything before you sign.
          </p>
        </div>
      </div>

      {q.quote && gauge && buy ? (
        <div className="animate-panel-in flex flex-col gap-4">
          <div className="border-2 border-ink bg-ground px-5 py-4">
            <DepthGauge
              vm={gauge}
              pairLabel={`${sell.address === USDG ? buy.symbol : sell.symbol}/USDG`}
            />
          </div>
          <RouteCard quote={q.quote} />
        </div>
      ) : buy && buyFacts ? (
        <div className="animate-panel-in">
          <TokenFactsCard
            token={buyFacts}
            change={tokenChange(market, buy.symbol)}
          />
        </div>
      ) : (
        <MarketMovers
          options={options}
          excludeAddress={sell.address}
          onPick={(o) => {
            setBuy(o);
            setRedZoneOk(false);
          }}
        />
      )}

      {reviewing && q.quote && buy && (
        <ReviewSheet
          quote={q.quote}
          slippage={slippage}
          quoteLoading={q.status === "loading"}
          onSlippage={setSlippage}
          onRequote={requote} // fresh quote arrives, fetchedAt changes, the sheet's countdown resets
          onClose={() => {
            setReviewing(false);
            void refresh().catch(() => {});
          }}
          onConfirm={(minBuyAmount, deadline) => {
            // Build the intent from the reviewed quote itself so the executor's
            // intent-vs-quote validation can never trip on stale panel state.
            const quote = q.quote;
            if (!quote) return Promise.reject(new Error("quote expired"));
            const intent: SwapIntent = {
              sellToken: quote.sell.address as `0x${string}`,
              buyToken: quote.buy.address as `0x${string}`,
              sellAmount: BigInt(quote.sell.amount),
              minBuyAmount,
              deadline,
              quote,
            };
            return walletExecutor(intent);
          }}
        />
      )}
    </div>
  );
}
