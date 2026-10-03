import { useEffect } from "react";

const LOCK_CLASS = "is-sheet-open";
const SCROLLBAR_PROPERTY = "--locked-scrollbar-width";

// Locks the page scroll while a modal sheet is open. A classic scrollbar's width, measured
// once per opening, is kept as padding so the page and the pinned bar do not shift.
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    root.style.setProperty(SCROLLBAR_PROPERTY, `${scrollbarWidth}px`);
    root.classList.add(LOCK_CLASS);
    return () => {
      root.classList.remove(LOCK_CLASS);
      root.style.removeProperty(SCROLLBAR_PROPERTY);
    };
  }, [active]);
}
