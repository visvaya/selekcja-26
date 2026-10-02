import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { useKeepFocus } from "./use-keep-focus.ts";
import { useWidthChange } from "./use-width-change.ts";

const CLUB_WIDTH_STEP_PX = 0.5;

// The club's CSS ellipsis is active when its text overflows the box.
const isClipped = (element: HTMLElement) =>
  element.scrollWidth > element.clientWidth + 1;

// A club clipped by its CSS ellipsis becomes a popover button with the full name.
export function useFittedClub(
  metaRef: RefObject<HTMLDivElement | null>,
  club: string,
) {
  const findClub = useCallback(
    () => metaRef.current?.querySelector<HTMLElement>(".meta-club") ?? null,
    [metaRef],
  );
  const [clipped, setClipped] = useState(false);
  const prepare = useKeepFocus(findClub, clipped);
  const fit = useCallback(() => {
    const element = findClub();
    if (!element) return;
    const next = isClipped(element);
    if (next === (element.tagName === "BUTTON")) return;
    prepare();
    // measuring the laid-out club is the external system this layout effect syncs with
    // oxlint-disable-next-line react/set-state-in-effect
    setClipped(next);
  }, [findClub, prepare]);
  useLayoutEffect(fit, [fit, club]);
  useWidthChange(metaRef, CLUB_WIDTH_STEP_PX, fit);
  return clipped;
}
