import { UI_CONFIG } from "./ui-config.ts";

export type Rect = { top: number; left: number; width: number; height: number };
type Size = { width: number; height: number };

export type PopoverPlacement = {
  top: number;
  left: number;
  side: "below" | "above";
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

// Places a popover left-aligned to its anchor, below it by `gapPx`, and flips it above when it
// would overflow the bottom edge and there is more room above. A popover taller than the room on
// both sides still goes to the side with more room and is then clamped into the viewport: its top
// never goes above `edgePx`, and one taller than the viewport starts at `edgePx` and overflows at
// the bottom, where the caller can scroll it.
export function placePopover({
  anchor,
  popover,
  viewport,
  gapPx = UI_CONFIG.popoverGapPx,
  edgePx = UI_CONFIG.popoverEdgePx,
}: {
  anchor: Rect;
  popover: Size;
  viewport: Size;
  gapPx?: number;
  edgePx?: number;
}): PopoverPlacement {
  const left = clamp(
    anchor.left,
    edgePx,
    viewport.width - edgePx - popover.width,
  );
  const belowTop = anchor.top + anchor.height + gapPx;
  const roomBelow = viewport.height - edgePx - belowTop;
  const roomAbove = anchor.top - gapPx - edgePx;
  const side =
    popover.height > roomBelow && roomAbove > roomBelow ? "above" : "below";
  const preferredTop =
    side === "below" ? belowTop : anchor.top - gapPx - popover.height;
  const top = Math.max(
    edgePx,
    Math.min(preferredTop, viewport.height - edgePx - popover.height),
  );
  return { top, left, side };
}
