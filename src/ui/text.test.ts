import test from "node:test";
import assert from "node:assert/strict";
import { UI_TEXT as text } from "./text.ts";

test("age uses the Polish plural form for the number of years", () => {
  const cases: [number, string][] = [
    [1, "1 rok"],
    [2, "2 lata"],
    [4, "4 lata"],
    [5, "5 lat"],
    [12, "12 lat"],
    [14, "14 lat"],
    [20, "20 lat"],
    [21, "21 lat"],
    [22, "22 lata"],
    [24, "24 lata"],
    [26, "26 lat"],
    [32, "32 lata"],
    [34, "34 lata"],
    [35, "35 lat"],
    [40, "40 lat"],
    [112, "112 lat"],
    [122, "122 lata"],
  ];
  for (const [years, expected] of cases)
    assert.equal(text.age(years), expected, `age(${years})`);
});
