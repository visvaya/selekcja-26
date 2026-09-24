import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function GameDialog({
  title,
  eyebrow,
  children,
  onClose,
  blocking = false,
  restoreFocusFallback,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  blocking?: boolean;
  // Called on close when the element that opened the dialog is no longer in the
  // document (e.g. it belonged to a screen that was replaced while the dialog was
  // open), so focus does not fall back to the body.
  restoreFocusFallback?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On some browsers a tap that opens the dialog never focuses the tapped button (a
    // touch-input default, not something this app controls), leaving document.body as the
    // active element. Treat that the same as "nothing to restore" rather than trying to
    // focus the body back, which would silently drop focus on close.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      // The opener can still be in the document but no longer focusable (e.g. the finalize
      // button is disabled once the next screen starts empty), so a failed focus() call must
      // also fall through to the fallback rather than leaving focus on the body.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
        if (document.activeElement === previouslyFocused) return;
      }
      restoreFocusFallback?.();
    };
  }, [title, restoreFocusFallback]);
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !blocking) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = [
      ...(dialogRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not([disabled])",
      ) ?? []),
    ];
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <div className="modal-wrap" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <h2 id="modal-title">{title}</h2>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {children}
      </div>
    </div>
  );
}
