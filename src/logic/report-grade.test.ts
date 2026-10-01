import test from "node:test";
import assert from "node:assert/strict";
import { displayGrade } from "./report-grade.ts";

test("frozen letter grades map onto the 1-6 scale", () => {
  const mapped = ["A+", "A", "B+", "B", "C+", "C"].map(displayGrade);
  assert.deepEqual(mapped, ["6", "5", "4+", "4", "3+", "3"]);
});

test("grades already on the 1-6 scale pass through", () => {
  assert.equal(displayGrade("4+"), "4+");
  assert.equal(displayGrade("2"), "2");
});

test("inherited object keys are not treated as letter grades", () => {
  assert.equal(displayGrade("constructor"), "constructor");
  assert.equal(displayGrade("toString"), "toString");
});
