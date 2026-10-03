import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { UI_CONFIG } from "./ui-config.ts";
import { useMediaQuery } from "./use-media-query.ts";

type SlideOptions = {
  sheetRef: RefObject<HTMLElement | null>;
  bodyRef: RefObject<HTMLElement | null>;
  scrimRef: RefObject<HTMLElement | null>;
  open: boolean;
};

const DRAGGING_CLASS = "is-dragging";
const VISIBLE_CLASS = "is-visible";

const below = (sheet: HTMLElement) => `translateY(${sheet.offsetHeight}px)`;

// The sheet slides up from behind the bar and back behind it, and the scrim fades with
// it; with reduced motion both appear and disappear at once. The hook owns the sheet's
// and the scrim's `hidden` attribute and the sheet's `transform`. A later change cancels
// a slide still running, and reopening during the closing slide continues from where
// the sheet is.
export function useSheetSlide({
  sheetRef,
  bodyRef,
  scrimRef,
  open,
}: SlideOptions): void {
  const reducedMotion = useMediaQuery(UI_CONFIG.reducedMotionQuery);
  const reducedRef = useRef(reducedMotion);
  const runRef = useRef(0);
  const stopPendingRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const scrim = scrimRef.current;
    if (!sheet) return;
    const first = runRef.current === 0;
    const run = ++runRef.current;
    stopPendingRef.current?.();
    stopPendingRef.current = null;

    if (open) {
      if (scrim) {
        scrim.hidden = false;
        scrim.getBoundingClientRect();
        scrim.classList.add(VISIBLE_CLASS);
      }
      const wasHidden = sheet.hidden;
      sheet.hidden = false;
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      if (!reducedRef.current && wasHidden) {
        sheet.classList.add(DRAGGING_CLASS);
        sheet.style.transform = below(sheet);
        sheet.getBoundingClientRect();
        sheet.classList.remove(DRAGGING_CLASS);
      }
      // still shown (closing): the transition turns back from the current position
      sheet.style.transform = "";
      return;
    }

    scrim?.classList.remove(VISIBLE_CLASS);
    const finish = () => {
      if (run !== runRef.current) return;
      stopPendingRef.current?.();
      stopPendingRef.current = null;
      sheet.hidden = true;
      sheet.style.transform = "";
      if (scrim) scrim.hidden = true;
    };
    if (first || reducedRef.current || sheet.hidden) {
      finish();
      return;
    }
    sheet.style.transform = below(sheet);
    const onEnd = (event: Event) => {
      if (event.target !== sheet) return;
      if ((event as TransitionEvent).propertyName !== "transform") return;
      finish();
    };
    sheet.addEventListener("transitionend", onEnd);
    // fallback when no transition runs (the sheet was already at that position)
    const timer = setTimeout(finish, UI_CONFIG.sheetSlideFallbackMs);
    stopPendingRef.current = () => {
      sheet.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
    };
  }, [open, sheetRef, bodyRef, scrimRef]);

  useEffect(
    () => () => {
      runRef.current += 1;
      stopPendingRef.current?.();
      stopPendingRef.current = null;
    },
    [],
  );
}
