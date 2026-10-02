import test from "node:test";
import assert from "node:assert/strict";
import { scoreBand } from "./score-band.ts";

test("scoreBand splits values at 85 and 75", () => {
  const values = [100, 85, 84.9, 84, 75, 74.9, 74, 0];
  assert.deepEqual(values.map(scoreBand), [
    "high",
    "high",
    "mid",
    "mid",
    "mid",
    "low",
    "low",
    "low",
  ]);
});
test("scoreBand(NaN) is low", () => {
  assert.equal(scoreBand(Number.NaN), "low");
});
