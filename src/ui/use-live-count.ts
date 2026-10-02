import { useEffect, useRef, useState } from "react";
import { players } from "../data/catalog.ts";
import { UI_TEXT as text } from "./text.ts";
import { UI_CONFIG } from "./ui-config.ts";

// Text for the list's status region: empty on first render; after `delayMs` without further
// changes it announces the visible count, only when it differs from the last announced one.
export function useLiveCount(
  count: number,
  delayMs: number = UI_CONFIG.liveCountDebounceMs,
): string {
  const [message, setMessage] = useState("");
  const announced = useRef(count);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (count === announced.current) return;
      announced.current = count;
      setMessage(text.visibleCount(count, players.length));
    }, delayMs);
    return () => clearTimeout(timer);
  }, [count, delayMs]);
  return message;
}
