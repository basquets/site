import { type ApiQuote, BasquetsApi } from "@basquets/api-client";
import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

export interface QuoteState {
  status: "idle" | "loading" | "ready" | "error";
  quote: ApiQuote | null;
  error: string | null;
}

/** Debounced live quote. `amount` is raw sell-token units as a string; empty
 *  disables. `slippageBps` is forwarded to the API so the executor's minimum
 *  received always matches what the user was quoted. Bump `nonce` to force a
 *  fresh quote with unchanged inputs (the review sheet's re-quote at countdown
 *  expiry). */
export function useQuote(
  sell: string | null,
  buy: string | null,
  amount: string,
  taker: string | null,
  slippageBps: number,
  nonce = 0,
): QuoteState {
  const [state, setState] = useState<QuoteState>({
    status: "idle",
    quote: null,
    error: null,
  });
  const seq = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce is a deliberate extra dep — bumping it forces a re-quote with unchanged inputs
  useEffect(() => {
    if (!API_URL || !sell || !buy || !amount || amount === "0") {
      seq.current++; // invalidate any in-flight fetch so it can't overwrite the idle state
      setState({ status: "idle", quote: null, error: null });
      return;
    }
    const mySeq = ++seq.current;
    setState((s) => ({ ...s, status: "loading" }));
    const t = setTimeout(async () => {
      try {
        const api = new BasquetsApi(API_URL);
        const quote = await api.quote({
          sell,
          buy,
          amount,
          taker: taker ?? undefined,
          slippageBps,
        });
        if (seq.current === mySeq)
          setState({ status: "ready", quote, error: null });
      } catch (e) {
        if (seq.current === mySeq)
          setState({
            status: "error",
            quote: null,
            error: (e as Error).message,
          });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [sell, buy, amount, taker, slippageBps, nonce]);
  return state;
}
