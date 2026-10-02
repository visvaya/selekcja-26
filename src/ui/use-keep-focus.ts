import { useCallback, useLayoutEffect, useRef } from "react";

// Keeps focus when a strip element switches between a button and plain text: call `prepare`
// before the switch; after it, focus moves to the new element when it is a button, otherwise
// to the strip's position badge (the nearest focusable element before it).
export function useKeepFocus(
  find: () => HTMLElement | null,
  form: unknown,
): () => void {
  const pending = useRef(false);
  const prepare = useCallback(() => {
    const element = find();
    pending.current =
      element !== null && element.ownerDocument.activeElement === element;
  }, [find]);
  useLayoutEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    const element = find();
    if (element?.tagName === "BUTTON") {
      element.focus();
      return;
    }
    element
      ?.closest(".player")
      ?.querySelector<HTMLElement>("button.pos")
      ?.focus();
  }, [find, form]);
  return prepare;
}
