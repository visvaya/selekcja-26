import { UI_CONFIG } from "./ui-config.ts";

export type DragRelease = {
  dyPx: number;
  elapsedMs: number;
  sheetHeightPx: number;
};

// Far: past 30 % of the sheet, at most 160 px. Fast: at least 24 px at more
// than 0.6 px/ms.
export function dragOutcome({
  dyPx,
  elapsedMs,
  sheetHeightPx,
}: DragRelease): "close" | "spring" {
  const far =
    dyPx >
    Math.min(
      UI_CONFIG.sheetFarCloseMaxPx,
      sheetHeightPx * UI_CONFIG.sheetFarCloseHeightRatio,
    );
  const fast =
    dyPx >= UI_CONFIG.sheetFastCloseMinPx &&
    dyPx / Math.max(1, elapsedMs) > UI_CONFIG.sheetFastCloseSpeedPxPerMs;
  return far || fast ? "close" : "spring";
}

export const dragOffset = (startY: number, y: number): number =>
  Math.max(0, y - startY);

export const isRealDrag = (startY: number, y: number): boolean =>
  Math.abs(y - startY) > UI_CONFIG.sheetDragClickSlopPx;

export type BarScroll = {
  anchorY: number;
  y: number;
  nearEnd: boolean;
  reducedMotion: boolean;
  away: boolean;
};

// The closed bar slides away while the list scrolls down and returns on scrolling up,
// near the end of the page and always with reduced motion. The movement is measured from
// an anchor (see `nextBarScroll`), so many small scroll events add up.
export function nextBarAway({
  anchorY,
  y,
  nearEnd,
  reducedMotion,
  away,
}: BarScroll): boolean {
  if (reducedMotion || nearEnd || y < anchorY - UI_CONFIG.barScrollStepPx)
    return false;
  if (
    y > anchorY + UI_CONFIG.barScrollStepPx &&
    y > UI_CONFIG.barHideMinScrollPx
  )
    return true;
  return away;
}

export type BarScrollStep = Omit<BarScroll, "anchorY"> & {
  anchorY: number;
  lastY: number;
};

// One scroll event: the anchor moves to the previous position when the direction turns
// and to the current one when the decision changes.
export function nextBarScroll({ lastY, ...input }: BarScrollStep): {
  away: boolean;
  anchorY: number;
} {
  const turned =
    Math.sign(input.y - lastY) * Math.sign(lastY - input.anchorY) < 0;
  const anchorY = turned ? lastY : input.anchorY;
  const away = nextBarAway({ ...input, anchorY });
  return { away, anchorY: away === input.away ? anchorY : input.y };
}
