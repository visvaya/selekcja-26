import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { HintButton } from "./hint-button.tsx";
import { openPopovers } from "./open-popovers.ts";
import { UI_TEXT as text } from "./text.ts";
import { UI_CONFIG } from "./ui-config.ts";
import { useMediaQuery } from "./use-media-query.ts";
import { useSheetDrag } from "./use-sheet-drag.ts";

type GameDialogProps = {
  // "drawer": a bottom drawer below 768 px and a centred dialog with an X from 768 px; it
  // closes from the scrim too. "plain": a centred dialog closed only by its buttons and Escape.
  form?: "drawer" | "plain";
  role?: "dialog" | "alertdialog";
  eyebrow?: string;
  title: string;
  // The heading itself is styled as the eyebrow, with no separate eyebrow above it.
  titleAsEyebrow?: boolean;
  // Rendered as a paragraph that describes the dialog (aria-describedby).
  description?: string;
  // Placed in one title row with the eyebrow and the heading (the profile's club line and
  // score), so the score can sit next to the name.
  titleRow?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  // Ignores Escape: the dialog waits for one of its own choices.
  blocking?: boolean;
  // The element focused on open; defaults to the drawer's heading or the plain form's first
  // button.
  initialFocusRef?: RefObject<HTMLElement | null>;
  // Called on close when the element that opened the dialog is gone or unusable, so focus
  // does not fall back to the body.
  restoreFocusFallback?: () => void;
  className?: string;
};

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function insideClosedPopover(element: HTMLElement): boolean {
  try {
    return element.closest("[popover]:not(:popover-open)") !== null;
  } catch {
    return false;
  }
}

// Every focusable control of the panel that can take focus now. Hidden ones (the X below
// 768 px) have no boxes; without layout (no element has boxes) every candidate counts.
function focusables(panel: HTMLElement): HTMLElement[] {
  const candidates = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      !element.closest("[hidden]") &&
      !insideClosedPopover(element),
  );
  const visible = candidates.filter(
    (element) => element.getClientRects().length > 0,
  );
  return visible.length > 0 ? visible : candidates;
}

// The opener can still be in the document but no longer usable (the finalize button is
// aria-disabled once the next screen starts empty), or hidden inside the closed phone sheet:
// such an opener, or a failed focus() call, falls through to the fallback.
function restoreFocus(opener: HTMLElement | null, fallback?: () => void) {
  if (
    opener &&
    document.contains(opener) &&
    opener.getAttribute("aria-disabled") !== "true" &&
    !opener.closest("[hidden]")
  ) {
    opener.focus();
    if (document.activeElement === opener) return;
  }
  fallback?.();
}

// The scrim closes a drawer-form dialog only when the press started on it too, so a text
// selection dragged out of the panel does not close it. Native listeners: the scrim is a
// presentation element, not a control.
function useScrimClose(
  wrapRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !enabled) return undefined;
    let pressedOnScrim = false;
    const down = (event: Event) => {
      pressedOnScrim = event.target === wrap;
    };
    const click = (event: Event) => {
      const fromScrim = pressedOnScrim && event.target === wrap;
      pressedOnScrim = false;
      if (fromScrim) onCloseRef.current();
    };
    wrap.addEventListener("pointerdown", down);
    wrap.addEventListener("click", click);
    return () => {
      wrap.removeEventListener("pointerdown", down);
      wrap.removeEventListener("click", click);
    };
  }, [wrapRef, enabled]);
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function GameDialog({
  form = "plain",
  role = "dialog",
  eyebrow,
  title,
  titleAsEyebrow = false,
  description,
  titleRow,
  children,
  footer,
  onClose,
  blocking = false,
  initialFocusRef,
  restoreFocusFallback,
  className,
}: GameDialogProps) {
  const drawer = form === "drawer";
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Read by the once-per-mount focus effect, so a prop change never re-runs it.
  const fallbackRef = useRef(restoreFocusFallback);
  const initialFocus = useRef(initialFocusRef);
  useLayoutEffect(() => {
    fallbackRef.current = restoreFocusFallback;
    initialFocus.current = initialFocusRef;
  });

  useScrimClose(wrapRef, drawer, onClose);

  const canDrag = useMediaQuery(UI_CONFIG.sheetDragQuery);
  useSheetDrag({
    handleRef,
    sheetRef: panelRef,
    enabled: drawer && canDrag,
    onClose,
  });

  useEffect(() => {
    // A tap that opens the dialog may leave the body focused (Safari): nothing to restore then.
    const opener =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    const target =
      initialFocus.current?.current ??
      (drawer
        ? headingRef.current
        : panel?.querySelector<HTMLButtonElement>("button"));
    target?.focus();
    return () => restoreFocus(opener, fallbackRef.current);
    // once per mount: the form never changes while the dialog is open
  }, [drawer]);

  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    const list = focusables(panel);
    const first = list[0],
      last = list.at(-1);
    if (!first || !last) return;
    const active = document.activeElement as HTMLElement | null;
    const index = active ? list.indexOf(active) : -1;
    if (event.shiftKey && (index === 0 || (index === -1 && active))) {
      // From the heading (not in the cycle), go to the control before it (not the scroll
      // region that holds it), or wrap.
      const before =
        index === -1 && active
          ? list.filter(
              (element) =>
                !element.contains(active) &&
                Boolean(
                  element.compareDocumentPosition(active) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
                ),
            )
          : [];
      event.preventDefault();
      (before.at(-1) ?? last).focus();
    } else if (!event.shiftKey && index === list.length - 1) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      trapTab(event);
      return;
    }
    if (event.key !== "Escape" || blocking) return;
    // A hint or an open popover consumes Escape first.
    if (event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
    if (openPopovers().length > 0) return;
    event.preventDefault();
    onClose();
  }

  const heading = (
    <h2
      id={titleId}
      ref={headingRef}
      className={titleAsEyebrow ? "eyebrow compare-title" : undefined}
      tabIndex={drawer ? -1 : undefined}
    >
      {title}
    </h2>
  );
  const eyebrowLine = eyebrow && !titleAsEyebrow && (
    <div className="eyebrow">{eyebrow}</div>
  );
  const content = (
    <>
      {titleRow ? (
        <div className="profile-title-row">
          <div className="profile-heading">
            {eyebrowLine}
            {heading}
          </div>
          {titleRow}
        </div>
      ) : (
        <>
          {eyebrowLine}
          {heading}
        </>
      )}
      {description && <p id={descriptionId}>{description}</p>}
      {children}
    </>
  );

  return (
    <div
      className={drawer ? "modal-wrap drawer-phone" : "modal-wrap"}
      role="presentation"
      ref={wrapRef}
    >
      {/* The panel is a dialog or an alertdialog; the linter cannot read a dynamic role. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={className ? `modal ${className}` : "modal"}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={panelRef}
        onKeyDown={onKeyDown}
      >
        {drawer ? (
          <>
            <HintButton
              className="dlg-close"
              label={text.closeDialog}
              hint={text.closeDialogHint}
              onClick={onClose}
            >
              <CloseIcon />
            </HintButton>
            <div className="dlg-handle" aria-hidden="true" ref={handleRef} />
            {/* The body scrolls inside itself, so keyboard users must be able to focus it. */}
            <div
              className="dlg-scroll"
              role="region"
              aria-labelledby={titleId}
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
            >
              {content}
            </div>
            {footer && <div className="dlg-footer">{footer}</div>}
          </>
        ) : (
          <>
            {content}
            {footer}
          </>
        )}
      </div>
    </div>
  );
}
