import test from "node:test";
import assert from "node:assert/strict";
import { formatSignedImpact, joinNames, plural } from "./plural.ts";

test("plural picks the Polish form for the count", () => {
  const forms = ["rok", "lata", "lat"] as const;
  const cases: [number, string][] = [
    [0, "lat"],
    [1, "rok"],
    [2, "lata"],
    [4, "lata"],
    [5, "lat"],
    [12, "lat"],
    [14, "lat"],
    [21, "lat"],
    [22, "lata"],
    [24, "lata"],
    [112, "lat"],
    [122, "lata"],
  ];
  for (const [count, expected] of cases)
    assert.equal(plural(count, ...forms), expected, `plural(${count})`);
});

test("joinNames joins with commas and i before the last name", () => {
  assert.equal(joinNames([]), "");
  assert.equal(joinNames(["A"]), "A");
  assert.equal(joinNames(["A", "B"]), "A i B");
  assert.equal(joinNames(["A", "B", "C"]), "A, B i C");
});

test("formatSignedImpact uses a plus for zero and up and U+2212 for negatives", () => {
  assert.equal(formatSignedImpact(2), "+2");
  assert.equal(formatSignedImpact(0), "+0");
  assert.equal(formatSignedImpact(-1), "−1");
  assert.equal(formatSignedImpact(-2), "−2");
});
