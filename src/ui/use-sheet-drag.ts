import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { dragOffset, dragOutcome, isRealDrag } from "./sheet-gestures.ts";

type DragOptions = {
  handleRef: RefObject<HTMLElement | null>;
  sheetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  onClose: () => void;
};

const DRAGGING_CLASS = "is-dragging";

// The sheet follows a drag on its handle and closes when pulled far, or fast after a
// minimum distance; otherwise it springs back. The click that ends a real drag is
// swallowed, so a short drag does not close the sheet through the handle's click.
// `cancel` ends a drag in progress without closing or springing back.
export function useSheetDrag({
  handleRef,
  sheetRef,
  enabled,
  onClose,
}: DragOptions): { cancel: () => void } {
  const onCloseRef = useRef(onClose);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet || !enabled) return;
    let startY: number | null = null;
    let startTime = 0;
    let dy = 0;
    let moved = false;
    let pointerId: number | null = null;

    const reset = () => {
      startY = null;
      sheet.classList.remove(DRAGGING_CLASS);
      if (pointerId !== null && handle.hasPointerCapture?.(pointerId))
        handle.releasePointerCapture(pointerId);
      pointerId = null;
    };
    const onDown = (event: PointerEvent) => {
      startY = event.clientY;
      startTime = event.timeStamp;
      dy = 0;
      moved = false;
      pointerId = event.pointerId;
      sheet.classList.add(DRAGGING_CLASS);
      handle.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (startY === null) return;
      if (isRealDrag(startY, event.clientY)) moved = true;
      dy = dragOffset(startY, event.clientY);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = (event: PointerEvent) => {
      if (startY === null) return;
      const outcome = dragOutcome({
        dyPx: dy,
        elapsedMs: event.timeStamp - startTime,
        sheetHeightPx: sheet.offsetHeight,
      });
      reset();
      // a close continues from where the finger let go
      if (outcome === "close") onCloseRef.current();
      else sheet.style.transform = "";
    };
    const onClick = (event: MouseEvent) => {
      if (!moved) return;
      moved = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const cancel = () => {
      if (startY === null) return;
      moved = false;
      reset();
    };

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
    handle.addEventListener("click", onClick, true);
    cancelRef.current = cancel;
    return () => {
      cancel();
      cancelRef.current = () => {};
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
      handle.removeEventListener("click", onClick, true);
    };
  }, [handleRef, sheetRef, enabled]);

  return { cancel: () => cancelRef.current() };
}
