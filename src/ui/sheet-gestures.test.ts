import test from "node:test";
import assert from "node:assert/strict";
import {
  dragOffset,
  dragOutcome,
  isRealDrag,
  nextBarAway,
  nextBarScroll,
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
  const base = {
    nearEnd: false,
    reducedMotion: false,
    focusInside: false,
    away: false,
  };
  assert.equal(nextBarAway({ ...base, anchorY: 100, y: 105 }), true);
  assert.equal(nextBarAway({ ...base, anchorY: 100, y: 104 }), false);
  assert.equal(nextBarAway({ ...base, anchorY: 20, y: 50 }), false);
  assert.equal(
    nextBarAway({ ...base, away: true, anchorY: 300, y: 295 }),
    false,
  );
  assert.equal(
    nextBarAway({ ...base, away: true, anchorY: 300, y: 297 }),
    true,
  );
});

test("near the end or with reduced motion the bar is always shown", () => {
  const base = { anchorY: 100, y: 400, away: true, focusInside: false };
  assert.equal(
    nextBarAway({ ...base, nearEnd: true, reducedMotion: false }),
    false,
  );
  assert.equal(
    nextBarAway({ ...base, nearEnd: false, reducedMotion: true }),
    false,
  );
});

function scrollSteps(from: number, to: number, away: boolean) {
  const step = Math.sign(to - from);
  let state = { away, anchorY: from };
  const seen: boolean[] = [];
  for (
    let y = from + step, lastY = from;
    y !== to + step;
    lastY = y, y += step
  ) {
    state = nextBarScroll({
      ...state,
      lastY,
      y,
      nearEnd: false,
      reducedMotion: false,
      focusInside: false,
    });
    seen.push(state.away);
  }
  return seen;
}

test("many 1 px steps up bring an away bar back once the total passes 4 px", () => {
  const seen = scrollSteps(300, 280, true);
  assert.deepEqual(seen.slice(0, 5), [true, true, true, true, false]);
  assert.equal(seen.at(-1), false);
});

test("many 1 px steps down hide the bar only past 60 px", () => {
  const seen = scrollSteps(0, 100, false);
  assert.equal(seen.indexOf(true), 60);
  assert.equal(seen.at(-1), true);
});

test("a turn in direction restarts the measured movement", () => {
  // down 3 px, then up 3 px: neither passes the step from the turn
  let state = { away: true, anchorY: 300 };
  for (const [lastY, y] of [
    [300, 301],
    [301, 303],
    [303, 301],
    [301, 300],
  ] as const)
    state = nextBarScroll({
      ...state,
      lastY,
      y,
      nearEnd: false,
      reducedMotion: false,
      focusInside: false,
    });
  assert.equal(state.away, true);
  state = nextBarScroll({
    ...state,
    lastY: 300,
    y: 298,
    nearEnd: false,
    reducedMotion: false,
    focusInside: false,
  });
  assert.equal(state.away, false);
});

test("focus inside the bar keeps it shown while scrolling down", () => {
  const input = {
    anchorY: 100,
    y: 200,
    nearEnd: false,
    reducedMotion: false,
    away: false,
  };
  assert.equal(nextBarAway({ ...input, focusInside: false }), true);
  assert.equal(nextBarAway({ ...input, focusInside: true }), false);
  assert.equal(
    nextBarScroll({ ...input, lastY: 199, focusInside: true }).away,
    false,
  );
});
