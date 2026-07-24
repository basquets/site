import { useEffect, useState } from "react";

/**
 * False during SSR and the hydration render, true from the first client effect.
 * The waitlist island renders its server markup (the sign-in buttons) until
 * this flips, so Privy's client-only state can't cause a hydration mismatch.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
