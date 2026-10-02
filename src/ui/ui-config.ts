export const UI_CONFIG = Object.freeze({
  scoreBandHighMinimumPoints: 85,
  scoreBandMidMinimumPoints: 75,
  popoverGapPx: 8,
  popoverEdgePx: 8,
  liveCountDebounceMs: 500,
  hintDelayMs: 300,
  // The desktop layout: side column with the board, no bottom dock.
  wideLayoutQuery: "(min-width: 1024px)",
  // The phone sheet: drag to close only on narrow screens.
  sheetDragQuery: "(max-width: 767.98px)",
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
  sheetDragClickSlopPx: 6,
  sheetFastCloseMinPx: 24,
  sheetFastCloseSpeedPxPerMs: 0.6,
  sheetFarCloseMaxPx: 160,
  sheetFarCloseHeightRatio: 0.3,
  sheetSlideFallbackMs: 500,
  // The closed bar hides while the page scrolls down.
  barScrollStepPx: 4,
  barHideMinScrollPx: 60,
});
