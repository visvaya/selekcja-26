import test from "node:test";
import assert from "node:assert/strict";
import { placePopover } from "./popover-position.ts";

const viewport = { width: 360, height: 740 };
const popover = { width: 200, height: 100 };

const cases = [
  {
    name: "room below",
    anchor: [100, 20, 80, 24],
    expected: { top: 132, left: 20, side: "below" },
  },
  {
    name: "right edge",
    anchor: [100, 300, 50, 24],
    expected: { top: 132, left: 152, side: "below" },
  },
  {
    name: "left edge",
    anchor: [100, 0, 50, 24],
    expected: { top: 132, left: 8, side: "below" },
  },
  {
    name: "bottom: flips above",
    anchor: [690, 20, 80, 24],
    expected: { top: 582, left: 20, side: "above" },
  },
] as const;

for (const { name, anchor, expected } of cases) {
  test(`placePopover: ${name}`, () => {
    const [top, left, width, height] = anchor;
    assert.deepEqual(
      placePopover({ anchor: { top, left, width, height }, popover, viewport }),
      expected,
    );
  });
}

test("placePopover: taller than both sides goes to the roomier side, clamped into the viewport", () => {
  const anchor = { top: 60, left: 20, width: 80, height: 24 };
  assert.deepEqual(
    placePopover({ anchor, popover: { width: 200, height: 700 }, viewport }),
    { top: 32, left: 20, side: "below" },
  );
});

test("placePopover: taller than the viewport starts at the edge", () => {
  const anchor = { top: 60, left: 20, width: 80, height: 24 };
  assert.deepEqual(
    placePopover({ anchor, popover: { width: 200, height: 900 }, viewport }),
    { top: 8, left: 20, side: "below" },
  );
});

test("placePopover: custom gap and edge", () => {
  const anchor = { top: 100, left: 0, width: 80, height: 24 };
  assert.deepEqual(
    placePopover({ anchor, popover, viewport, gapPx: 4, edgePx: 16 }),
    { top: 128, left: 16, side: "below" },
  );
});
