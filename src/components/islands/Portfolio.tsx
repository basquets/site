import { BasquetsApi } from "@basquets/api-client";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { buttonVariants } from "@/components/ui/button";
import { NATIVE_ETH, robinhoodChain, USDG, USDG_DECIMALS } from "@/lib/chain";
import { TOKENS } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { disconnect, switchToRobinhood } from "@/lib/wallet";
import { useBalances } from "./use-balances";
import { useHydrated } from "./use-hydrated";
import { tokenChange, useTokenMarket } from "./use-live-market";
import { useWallet } from "./use-wallet";

const label = "m-0 text-[11px] uppercase tracking-[0.1em] text-ink/55";
const usd = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;
const ADDRESSES = [USDG, NATIVE_ETH, ...TOKENS.map((t) => t.address)];

/** Chainlink ETH/USD via /v1/market. Typed loosely because the site's pinned
 *  api-client predates the field. */
function useEthUsd(): number | null {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    if (!API_URL) return;
    let cancelled = false;
    new BasquetsApi(API_URL)
      .market()
      .then((m) => {
        const v = (m as { ethUsd?: number | null }).ethUsd;
        if (!cancelled && typeof v === "number") setPrice(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return price;
}

/** The connected wallet's shelf: USDG cash, stock token positions valued at
 *  the market store's prices, and the basket slot for when baskets deploy. */
export default function Portfolio() {
  const liveWallet = useWallet();
  const hydrated = useHydrated();
  // Hydration must mirror the server's disconnected markup (see use-hydrated).
  const wallet = hydrated
    ? liveWallet
    : ({ status: "disconnected", address: null, error: null } as const);
  const market = useTokenMarket();
  const { balances } = useBalances(wallet.address, ADDRESSES);
  const ethUsd = useEthUsd();
  const [copied, setCopied] = useState(false);

  if (wallet.status === "disconnected")
    return (
      <div className="max-w-[520px] border-2 border-ink bg-ground p-[clamp(24px,3vw,36px)] shadow-lg">
        <span className={label}>Portfolio</span>
        <h2 className="mt-2.5 mb-0 font-heading font-extrabold text-[26px] tracking-[-0.015em]">
          Connect a wallet to see your shelf.
        </h2>
        <p className="mt-2.5 mb-6 text-[13.5px] leading-[21px] text-ink/65">
          Your USDG, your stock tokens, and your baskets, read straight from the
          chain. Nothing is stored here.
        </p>
        <a href="/connect" className={cn(buttonVariants({ size: "lg" }))}>
          Connect wallet
        </a>
      </div>
    );

  if (wallet.status === "connecting" || !wallet.address)
    return (
      <p className="m-0 py-8 text-[13px] text-ink/55" aria-live="polite">
        Portfolio: connecting…
      </p>
    );

  const address = wallet.address;
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const loaded = Object.keys(balances).length > 0;

  const usdgBalance = Number(
    formatUnits(balances[USDG.toLowerCase()] ?? 0n, USDG_DECIMALS),
  );
  const ethBalance = Number(formatUnits(balances[NATIVE_ETH] ?? 0n, 18));
  const ethValue = ethUsd !== null ? ethBalance * ethUsd : null;
  const positions = TOKENS.map((t) => {
    const raw = balances[t.address.toLowerCase()] ?? 0n;
    if (raw === 0n) return null;
    const amount = Number(formatUnits(raw, 18));
    const price = market.hist[t.sym]?.at(-1) ?? null;
    return {
      sym: t.sym,
      name: t.name,
      amount,
      price,
      value: price !== null ? amount * price : null,
      change: tokenChange(market, t.sym),
    };
  })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const stocksValue = positions.reduce((a, p) => a + (p.value ?? 0), 0);
  const unpriced = positions.filter((p) => p.price === null).length;
  const cashValue = usdgBalance + (ethValue ?? 0);
  const total = cashValue + stocksValue;

  return (
    <div className="flex flex-col gap-6">
      {/* the account, and the actions that used to hide in the navbar menu */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-2 border-ink bg-ground px-6 py-4">
        <div className="min-w-0">
          <p className={label}>Connected wallet</p>
          <p className="m-0 mt-1 break-all font-heading font-extrabold text-[15px] tnum">
            {address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "secondary" }))}
            onClick={() => {
              void navigator.clipboard.writeText(address).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          <a
            href={`${robinhoodChain.blockExplorers.default.url}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            View on explorer
          </a>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost" }))}
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>
      </div>

      {wallet.status === "wrong-chain" && (
        <p className="m-0 border-2 border-amber-600 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          Your wallet is on another network; balances below are read from
          Robinhood Chain either way.{" "}
          <button
            type="button"
            onClick={switchToRobinhood}
            className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-amber-900 underline"
          >
            Switch network
          </button>
        </p>
      )}

      {/* the numbers that matter, in the house stat lattice */}
      <dl className="m-0 grid grid-cols-2 border-t-2 border-l-2 border-divider lg:grid-cols-4">
        {[
          ["Total value", loaded ? usd(total) : "…"],
          ["Cash · USDG + ETH", loaded ? usd(cashValue) : "…"],
          ["Stock positions", loaded ? String(positions.length) : "…"],
          ["Baskets", "0"],
        ].map(([l, v]) => (
          <div
            key={l}
            className="border-r-2 border-b-2 border-divider bg-surface px-6 py-5"
          >
            <dt className="text-[11px] uppercase tracking-[0.1em] text-ink/55">
              {l}
            </dt>
            <dd className="m-0 mt-1.5 font-heading font-extrabold text-[clamp(24px,2.4vw,34px)] leading-none tracking-[-0.01em] tnum">
              {v}
            </dd>
          </div>
        ))}
      </dl>
      {unpriced > 0 && (
        <p className="-mt-3 mb-0 text-[12px] text-ink/55">
          {unpriced} {unpriced === 1 ? "position has" : "positions have"} no
          live price right now and {unpriced === 1 ? "is" : "are"} not counted
          in the total.
        </p>
      )}

      {/* cash and gas: the two assets every swap starts or ends in */}
      <div className="border-2 border-ink bg-ground">
        <div className="border-b-2 border-divider px-5 py-2.5">
          <span className={label}>Cash &amp; gas</span>
        </div>
        <ul className="m-0 list-none p-0">
          <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-divider px-5 py-3">
            <span className="w-14 font-heading font-extrabold">USDG</span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink/55">
              Global Dollar
            </span>
            <span className="text-[13px] text-ink/70 tnum">
              {loaded
                ? usdgBalance.toLocaleString("en-US", {
                    maximumFractionDigits: 4,
                  })
                : "…"}
            </span>
            <span className="w-28 text-right font-heading font-extrabold text-[14px] tnum">
              {loaded ? usd(usdgBalance) : ""}
            </span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3">
            <span className="w-14 font-heading font-extrabold">ETH</span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink/55">
              Ether, pays the gas
            </span>
            <span className="text-[13px] text-ink/70 tnum">
              {loaded
                ? ethBalance.toLocaleString("en-US", {
                    maximumFractionDigits: 5,
                  })
                : "…"}
            </span>
            <span className="w-24 text-right text-[13px] tnum">
              {ethUsd !== null ? usd(ethUsd) : "no feed"}
            </span>
            <span className="w-28 text-right font-heading font-extrabold text-[14px] tnum">
              {loaded && ethValue !== null ? usd(ethValue) : ""}
            </span>
          </li>
        </ul>
      </div>

      {/* stock positions */}
      <div className="border-2 border-ink bg-ground">
        <div className="flex items-baseline justify-between border-b-2 border-divider px-5 py-2.5">
          <span className={label}>Stock tokens</span>
          <span className={`${label} tnum`}>{short}</span>
        </div>
        {!loaded ? (
          <p
            className="m-0 px-5 py-6 text-[13px] text-ink/55"
            aria-live="polite"
          >
            Reading balances from chain 4663…
          </p>
        ) : positions.length === 0 ? (
          <div className="px-5 py-6">
            <p className="m-0 max-w-[52ch] text-[14.5px] leading-6 text-ink/75">
              No stock tokens in this wallet yet. The swap desk quotes two
              venues on every trade and fills at the better price.
            </p>
            <a
              href="/swap"
              className={cn(buttonVariants({ variant: "primary" }), "mt-4")}
            >
              Swap into your first stock
            </a>
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {positions.map((p) => (
              <li
                key={p.sym}
                className="border-b-2 border-divider last:border-b-0"
              >
                <a
                  href={`/stocks/${p.sym.toLowerCase()}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-ink no-underline hover:bg-surface"
                >
                  <span className="font-heading font-extrabold">{p.sym}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink/55">
                    {p.name.split("•")[0].trim()}
                  </span>
                  <span className="text-[13px] text-ink/70 tnum">
                    {p.amount.toLocaleString("en-US", {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <span className="w-24 text-right text-[13px] tnum">
                    {p.price !== null ? usd(p.price) : "no feed"}
                  </span>
                  <span
                    className={`w-16 text-right text-[13px] tnum ${
                      p.change == null
                        ? "text-ink/40"
                        : p.change >= 0
                          ? "text-gain"
                          : "text-loss"
                    }`}
                  >
                    {p.change == null
                      ? ""
                      : `${p.change >= 0 ? "+" : ""}${(p.change * 100).toFixed(2)}%`}
                  </span>
                  <span className="w-28 text-right font-heading font-extrabold text-[14px] tnum">
                    {p.value !== null ? usd(p.value) : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* baskets: honest about pre-launch */}
      <div className="border-2 border-ink bg-ground">
        <div className="border-b-2 border-divider px-5 py-2.5">
          <span className={label}>Baskets</span>
        </div>
        <div className="px-5 py-6">
          <p className="m-0 max-w-[56ch] text-[14.5px] leading-6 text-ink/75">
            Baskets have not launched yet; the moment they deploy, your
            positions appear here with live NAVs. Until then, the recipes are
            public.
          </p>
          <a
            href="/baskets"
            className={cn(buttonVariants({ variant: "secondary" }), "mt-4")}
          >
            Explore the launch lineup
          </a>
        </div>
      </div>
    </div>
  );
}
