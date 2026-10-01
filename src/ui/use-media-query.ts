import { useCallback, useSyncExternalStore } from "react";

function hasMatchMedia(): boolean {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  );
}

// Tracks a CSS media query through a `change` listener. Without `matchMedia` (jsdom, server
// rendering) it returns the default. React removes the listener on unmount, so no update
// reaches an unmounted component.
export function useMediaQuery(query: string, defaultMatches = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!hasMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  const getSnapshot = () =>
    hasMatchMedia() ? window.matchMedia(query).matches : defaultMatches;
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultMatches);
}
