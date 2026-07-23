import { type ApiPoolsResponse, BasquetsApi } from "@basquets/api-client";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.PUBLIC_API_URL as string | undefined;

export type PoolsState =
  | { mode: "loading" }
  | { mode: "unavailable" }
  | { mode: "live"; data: ApiPoolsResponse };

/** Fetches /v1/pools once on mount and refreshes every 60s. Pools change on the
 *  sync cadence, not per tick, so there is no live socket for them. */
export function useLivePools(): PoolsState {
  const [state, setState] = useState<PoolsState>({ mode: "loading" });

  useEffect(() => {
    if (!API_URL) {
      setState({ mode: "unavailable" });
      return;
    }
    const api = new BasquetsApi(API_URL);
    let alive = true;
    const load = () =>
      api
        .pools()
        .then((data) => {
          if (alive) setState({ mode: "live", data });
        })
        .catch(() => {
          if (alive)
            setState((s) => (s.mode === "live" ? s : { mode: "unavailable" }));
        });
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return state;
}
