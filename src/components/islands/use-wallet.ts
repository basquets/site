import { useSyncExternalStore } from "react";
import { walletStore } from "@/lib/wallet";

export function useWallet() {
  return useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
    walletStore.getSnapshot,
  );
}
