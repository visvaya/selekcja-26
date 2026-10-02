import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

// Calls `callback` when the observed element's width, rounded to `stepPx`, changes, and
// again once web fonts are ready and after every font load, since fonts reflow text without
// changing widths. Rounding keeps a fitting pass from re-triggering itself.
export function useWidthChange(
  ref: RefObject<HTMLElement | null>,
  stepPx: number,
  callback: () => void,
): void {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let lastStep = Number.NaN;
    let active = true;
    const run = () => {
      if (active) latest.current();
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const step = Math.round(
              element.getBoundingClientRect().width / stepPx,
            );
            if (step === lastStep) return;
            lastStep = step;
            run();
          });
    observer?.observe(element);
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    void fonts?.ready.then(run);
    fonts?.addEventListener("loadingdone", run);
    return () => {
      active = false;
      observer?.disconnect();
      fonts?.removeEventListener("loadingdone", run);
    };
  }, [ref, stepPx]);
}
