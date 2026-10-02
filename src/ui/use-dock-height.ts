import { useEffect } from "react";
import type { RefObject } from "react";

const PROPERTY = "--dock-height";

// Publishes the fixed squad bar's rendered height on the root, so the page reserves room
// for it and focus scrolling keeps controls above it. Reset to 0 px when inactive or gone.
export function useDockHeight(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    const reset = () => root.style.setProperty(PROPERTY, "0px");
    if (!element || !active) {
      reset();
      return;
    }
    const apply = () =>
      root.style.setProperty(
        PROPERTY,
        `${element.getBoundingClientRect().height}px`,
      );
    apply();
    // jsdom has no ResizeObserver; the first measurement above still runs there.
    if (typeof ResizeObserver === "undefined") return reset;
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => {
      observer.disconnect();
      reset();
    };
  }, [ref, active]);
}
