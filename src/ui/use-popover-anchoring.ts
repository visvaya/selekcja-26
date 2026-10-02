import { useEffect } from "react";
import { placePopover } from "./popover-position.ts";

type ToggleLike = Event & { newState?: string };

function triggerFor(popover: HTMLElement): HTMLElement | null {
  if (!popover.id) return null;
  return popover.ownerDocument.querySelector<HTMLElement>(
    `[popovertarget="${popover.id.replaceAll('"', '\\"')}"]`,
  );
}

function close(popover: HTMLElement): void {
  popover.removeAttribute("data-placed");
  if (typeof popover.hidePopover === "function") popover.hidePopover();
}

// Positions a native popover next to its trigger: fixed, below it, flipped above when there is no
// room. Returns false when the trigger is gone, so the caller can close the popover.
function place(popover: HTMLElement): boolean {
  const anchor = triggerFor(popover);
  if (!anchor || !anchor.isConnected) return false;
  const view = popover.ownerDocument.defaultView;
  const rect = anchor.getBoundingClientRect();
  const placement = placePopover({
    anchor: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    popover: { width: popover.offsetWidth, height: popover.offsetHeight },
    viewport: {
      width: view?.innerWidth ?? 0,
      height: view?.innerHeight ?? 0,
    },
  });
  popover.style.setProperty("--popover-top", `${placement.top}px`);
  popover.style.setProperty("--popover-left", `${placement.left}px`);
  popover.setAttribute("data-placed", placement.side);
  return true;
}

// One capturing `toggle` listener on the document serves every popover on the page, including
// ones rendered later. Open popovers follow their trigger on scroll (any scroll container) and
// resize, at most once per animation frame; one whose trigger has disappeared is closed.
export function usePopoverAnchoring(): void {
  useEffect(() => {
    const doc = document;
    const view = doc.defaultView;
    let open: readonly HTMLElement[] = [];
    let frame = 0;

    const reposition = () => {
      frame = 0;
      const lost = open.filter((popover) => !place(popover));
      open = open.filter((popover) => !lost.includes(popover));
      lost.forEach(close);
    };
    const schedule = () => {
      if (frame !== 0 || open.length === 0 || !view) return;
      frame = view.requestAnimationFrame(reposition);
    };
    const onToggle = (event: Event) => {
      const popover = event.target;
      if (!(popover instanceof HTMLElement)) return;
      if ((event as ToggleLike).newState !== "open") {
        popover.removeAttribute("data-placed");
        open = open.filter((item) => item !== popover);
        return;
      }
      if (!place(popover)) {
        close(popover);
        return;
      }
      open = [...open.filter((item) => item !== popover), popover];
    };

    doc.addEventListener("toggle", onToggle, true);
    doc.addEventListener("scroll", schedule, true);
    view?.addEventListener("resize", schedule);
    return () => {
      doc.removeEventListener("toggle", onToggle, true);
      doc.removeEventListener("scroll", schedule, true);
      view?.removeEventListener("resize", schedule);
      if (frame !== 0) view?.cancelAnimationFrame(frame);
    };
  }, []);
}
