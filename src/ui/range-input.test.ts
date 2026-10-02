import test from "node:test";
import assert from "node:assert/strict";
import {
  clampToScale,
  commitRange,
  fillPercent,
  parseRangeInput,
  stepValue,
} from "./range-input.ts";

const scale = { min: 20, max: 40 };

test("parseRangeInput reads numbers, empty text and both minus signs", () => {
  assert.equal(parseRangeInput(""), null);
  assert.equal(parseRangeInput("  "), null);
  assert.equal(parseRangeInput("-"), "invalid");
  assert.equal(parseRangeInput("abc"), "invalid");
  assert.equal(parseRangeInput("-2"), -2);
  assert.equal(parseRangeInput("−2"), -2);
  assert.equal(parseRangeInput("25"), 25);
  assert.equal(parseRangeInput("2.6"), 3);
});

test("clampToScale keeps a value inside the scale", () => {
  assert.equal(clampToScale(99, scale), 40);
  assert.equal(clampToScale(1, scale), 20);
  assert.equal(clampToScale(30, scale), 30);
});

test("stepValue starts an empty field at the scale ends and steps by one", () => {
  assert.equal(stepValue(null, 1, scale), 20);
  assert.equal(stepValue(null, -1, scale), 40);
  assert.equal(stepValue(40, 1, scale), 40);
  assert.equal(stepValue(20, -1, scale), 20);
  assert.equal(stepValue(30, 1, scale), 31);
  assert.equal(stepValue(30, -1, scale), 29);
});

test("commitRange overwrites the side not edited when min passes max", () => {
  assert.deepEqual(commitRange({ min: 30, max: 25 }, "min", scale), {
    min: 30,
    max: 30,
  });
  assert.deepEqual(commitRange({ min: 30, max: 25 }, "max", scale), {
    min: 25,
    max: 25,
  });
});

test("commitRange clamps and stores scale ends as null", () => {
  assert.deepEqual(commitRange({ min: 99, max: null }, "min", scale), {
    min: 40,
    max: null,
  });
  assert.deepEqual(commitRange({ min: 20, max: 40 }, "max", scale), {
    min: null,
    max: null,
  });
  assert.deepEqual(commitRange({ min: 1, max: 30 }, "max", scale), {
    min: null,
    max: 30,
  });
  assert.deepEqual(commitRange({ min: 25, max: 35 }, "min", scale), {
    min: 25,
    max: 35,
  });
});

test("fillPercent places the fill on the scale", () => {
  assert.deepEqual(fillPercent({ min: null, max: null }, scale), {
    from: 0,
    to: 100,
  });
  assert.deepEqual(fillPercent({ min: 25, max: 30 }, scale), {
    from: 25,
    to: 50,
  });
  assert.deepEqual(fillPercent({ min: 10, max: 99 }, scale), {
    from: 0,
    to: 100,
  });
  assert.deepEqual(fillPercent({ min: 30, max: 30 }, { min: 5, max: 5 }), {
    from: 0,
    to: 100,
  });
});
