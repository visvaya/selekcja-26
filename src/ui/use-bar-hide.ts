import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { nextBarScroll } from "./sheet-gestures.ts";
import { UI_CONFIG } from "./ui-config.ts";
import { useMediaQuery } from "./use-media-query.ts";

const AWAY_CLASS = "is-away";

// The closed bar slides away while the page scrolls down and comes back on scrolling up,
// near the end of the page, on focus inside it and always with reduced motion.
export function useBarHide({
  dockRef,
  open,
}: {
  dockRef: RefObject<HTMLElement | null>;
  open: boolean;
}): void {
  const reducedMotion = useMediaQuery(UI_CONFIG.reducedMotionQuery);
  const stateRef = useRef({ open, reducedMotion });

  useLayoutEffect(() => {
    stateRef.current = { open, reducedMotion };
    if (open || reducedMotion) dockRef.current?.classList.remove(AWAY_CLASS);
  }, [open, reducedMotion, dockRef]);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    let lastY = window.scrollY;
    let anchorY = lastY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!stateRef.current.open) {
        const nearEnd =
          y + window.innerHeight >=
          document.documentElement.scrollHeight - dock.offsetHeight;
        const next = nextBarScroll({
          anchorY,
          lastY,
          y,
          nearEnd,
          reducedMotion: stateRef.current.reducedMotion,
          away: dock.classList.contains(AWAY_CLASS),
        });
        dock.classList.toggle(AWAY_CLASS, next.away);
        anchorY = next.anchorY;
      } else anchorY = y;
      lastY = y;
    };
    const onFocusIn = () => dock.classList.remove(AWAY_CLASS);
    window.addEventListener("scroll", onScroll, { passive: true });
    dock.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      dock.removeEventListener("focusin", onFocusIn);
      dock.classList.remove(AWAY_CLASS);
    };
  }, [dockRef]);
}
