import { useSyncExternalStore } from "react";

// Single source of truth for Privy auth across Astro islands. `PrivyNav` (in the
// shared nav) hosts the one PrivyProvider and pushes state here via its bridge;
// the `/join` WaitlistFlow island — a separate React root, outside the provider
// — reads this store and calls the registered login/logout actions. Mirrors the
// app repo's wallet-store bridge, trimmed to what the waitlist needs.

export interface PrivySnapshot {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
}

export interface PrivyActions {
  login: () => void;
  logout: () => Promise<void> | void;
}

let snapshot: PrivySnapshot = { ready: false, authenticated: false, address: null };
const listeners = new Set<() => void>();

export const privyStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot: () => snapshot,
};

export function setPrivySnapshot(next: PrivySnapshot): void {
  if (
    snapshot.ready === next.ready &&
    snapshot.authenticated === next.authenticated &&
    snapshot.address === next.address
  )
    return; // no change — keep the reference stable for useSyncExternalStore
  snapshot = next;
  for (const l of listeners) l();
}

let actions: PrivyActions | null = null;
export function setPrivyActions(a: PrivyActions): void {
  actions = a;
}
export function privyActions(): PrivyActions | null {
  return actions;
}

export function usePrivyState(): PrivySnapshot {
  return useSyncExternalStore(
    privyStore.subscribe,
    privyStore.getSnapshot,
    privyStore.getSnapshot,
  );
}
