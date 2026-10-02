import { useEffect, useState, type RefObject } from "react";

// Edge fades of a horizontally scrolling row: "fade-left" once scrolled from the start,
// "fade-right" while more content follows. A focused child is scrolled into view.
export function useEdgeFade(ref: RefObject<HTMLElement | null>): string {
  const [fade, setFade] = useState({ left: false, right: false });
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => {
      const scrollable = row.scrollWidth > row.clientWidth + 1;
      const left = scrollable && row.scrollLeft > 1;
      const right =
        scrollable && row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
      setFade((current) =>
        current.left === left && current.right === right
          ? current
          : { left, right },
      );
    };
    const reveal = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    row.addEventListener("focusin", reveal);
    window.addEventListener("resize", update);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      row.removeEventListener("focusin", reveal);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [ref]);
  return [fade.left ? "fade-left" : "", fade.right ? "fade-right" : ""]
    .filter(Boolean)
    .join(" ");
}
