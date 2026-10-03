import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

interface HintButtonProps {
  hint: string;
  label: string;
  className?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

// Keyboard focus counts only when it is visible; where the selector is unsupported, any focus.
function hasVisibleFocus(element: HTMLElement): boolean {
  if (element.ownerDocument.activeElement !== element) return false;
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

// Where matchMedia is missing (tests), hovering is assumed possible.
function canHover(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view || typeof view.matchMedia !== "function") return true;
  return view.matchMedia("(hover: hover)").matches;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

// An icon-only button with a hint: the hint is the accessible description and a tooltip that
// CSS shows on visible focus at once and on hover after a delay. Escape dismisses a shown hint
// and is consumed, so the layer under it stays open; leaving or blurring restores the hint.
// @public: not wired into a screen yet; drop this tag once a dialog renders it.
/** @public */
export function HintButton({
  hint,
  label,
  className,
  onClick,
  buttonRef,
  children,
}: HintButtonProps) {
  const tipId = useId();
  const ownRef = useRef<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const setRefs = useCallback(
    (element: HTMLButtonElement | null) => {
      ownRef.current = element;
      assignRef(buttonRef, element);
    },
    [buttonRef],
  );

  // Native listeners: React emulates enter and leave through over and out events.
  useEffect(() => {
    const button = ownRef.current;
    if (!button) return undefined;
    // The tip shows on hover only where the pointer can hover, never for touch.
    const enter = (event: Event) => {
      const type = (event as PointerEvent).pointerType;
      if (type !== "mouse" && type !== "pen") return;
      if (!canHover(button)) return;
      setHovered(true);
    };
    const leave = () => {
      setHovered(false);
      setDismissed(false);
    };
    button.addEventListener("pointerenter", enter);
    button.addEventListener("pointerleave", leave);
    return () => {
      button.removeEventListener("pointerenter", enter);
      button.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    const button = ownRef.current;
    if (!button || dismissed || !(hovered || focused)) return undefined;
    const doc = button.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!hovered && !hasVisibleFocus(button)) return;
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    };
    doc.addEventListener("keydown", onKeyDown, true);
    return () => doc.removeEventListener("keydown", onKeyDown, true);
  }, [hovered, focused, dismissed]);

  const classes = ["has-hint", className, dismissed ? "hint-dismissed" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={setRefs}
      type="button"
      className={classes}
      aria-label={label}
      aria-describedby={tipId}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setDismissed(false);
      }}
    >
      {children}
      <span className="hint-tip" role="tooltip" id={tipId}>
        {hint}
      </span>
    </button>
  );
}
