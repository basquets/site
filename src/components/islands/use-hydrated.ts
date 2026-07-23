import { useEffect, useState } from "react";

/**
 * False during SSR and the hydration render, true from the first client
 * effect. Wallet-dependent islands render their server markup (the
 * disconnected state) until this flips, because the navbar's PrivyBridge often
 * moves the shared wallet store to "connecting" before later islands hydrate,
 * and React 19 treats that divergence as a hydration error.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
