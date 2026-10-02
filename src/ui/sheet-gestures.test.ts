import test from "node:test";
import assert from "node:assert/strict";
import {
  dragOffset,
  dragOutcome,
  isRealDrag,
  nextBarAway,
} from "./sheet-gestures.ts";

test("a long drag closes: more than 30 % of a short sheet", () => {
  assert.equal(
    dragOutcome({ dyPx: 121, elapsedMs: 900, sheetHeightPx: 400 }),
    "close",
  );
  assert.equal(
    dragOutcome({ dyPx: 119, elapsedMs: 900, sheetHeightPx: 400 }),
    "spring",
  );
});

test("a long drag closes: more than 160 px of a tall sheet", () => {
  assert.equal(
    dragOutcome({ dyPx: 161, elapsedMs: 900, sheetHeightPx: 700 }),
    "close",
  );
  assert.equal(
    dragOutcome({ dyPx: 160, elapsedMs: 900, sheetHeightPx: 700 }),
    "spring",
  );
});

test("a fast flick closes only from 24 px", () => {
  assert.equal(
    dragOutcome({ dyPx: 30, elapsedMs: 20, sheetHeightPx: 700 }),
    "close",
  );
  assert.equal(
    dragOutcome({ dyPx: 23, elapsedMs: 5, sheetHeightPx: 700 }),
    "spring",
  );
  assert.equal(
    dragOutcome({ dyPx: 40, elapsedMs: 400, sheetHeightPx: 700 }),
    "spring",
  );
});

test("zero elapsed time does not divide by zero", () => {
  assert.equal(
    dragOutcome({ dyPx: 24, elapsedMs: 0, sheetHeightPx: 700 }),
    "close",
  );
});

test("the offset never goes above the start and the slop is 6 px", () => {
  assert.equal(dragOffset(100, 80), 0);
  assert.equal(dragOffset(100, 130), 30);
  assert.equal(isRealDrag(100, 106), false);
  assert.equal(isRealDrag(100, 107), true);
  assert.equal(isRealDrag(100, 93), true);
});

test("the bar hides after scrolling down below 60 px and returns on scrolling up", () => {
  const base = { nearEnd: false, reducedMotion: false, away: false };
  assert.equal(nextBarAway({ ...base, lastY: 100, y: 105 }), true);
  assert.equal(nextBarAway({ ...base, lastY: 100, y: 104 }), false);
  assert.equal(nextBarAway({ ...base, lastY: 20, y: 50 }), false);
  assert.equal(nextBarAway({ ...base, away: true, lastY: 300, y: 295 }), false);
  assert.equal(nextBarAway({ ...base, away: true, lastY: 300, y: 297 }), true);
});

test("near the end or with reduced motion the bar is always shown", () => {
  const base = { lastY: 100, y: 400, away: true };
  assert.equal(
    nextBarAway({ ...base, nearEnd: true, reducedMotion: false }),
    false,
  );
  assert.equal(
    nextBarAway({ ...base, nearEnd: false, reducedMotion: true }),
    false,
  );
});
