import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSizes } from "./check-size.mjs";

const BUDGET = { js: 100, css: 50, fonts: 200 };

test("sums the measured bytes per kind and passes within the budget", () => {
  const result = checkSizes(
    [
      { path: "assets/index-a1.js", bytes: 60 },
      { path: "assets/lazy-b2.js", bytes: 40 },
      { path: "assets/index-c3.css", bytes: 50 },
      { path: "assets/face-d4.woff2", bytes: 120 },
      { path: "index.html", bytes: 999 },
    ],
    BUDGET,
  );
  assert.deepEqual(result.totals, { js: 100, css: 50, fonts: 120 });
  assert.deepEqual(result.problems, []);
});

test("an exceeded budget lists that kind's files, largest first", () => {
  const result = checkSizes(
    [
      { path: "assets/small-a1.js", bytes: 30 },
      { path: "assets/big-b2.js", bytes: 80 },
      { path: "assets/index-c3.css", bytes: 10 },
    ],
    BUDGET,
  );
  assert.deepEqual(result.problems, [
    "js: 110 bytes, budget 100 bytes",
    "  80 assets/big-b2.js",
    "  30 assets/small-a1.js",
  ]);
});
