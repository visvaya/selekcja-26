import test from "node:test";
import assert from "node:assert/strict";
import { countLines, hiddenTraitCount } from "./fit-traits.ts";
import { UI_TEXT as text } from "./text.ts";

test("a row on one line hides nothing", () => {
  assert.equal(hiddenTraitCount([1, 1, 1]), 0);
});

test("hides the fewest tags from the end that bring the row to one line", () => {
  assert.equal(hiddenTraitCount([3, 2, 2, 1, 1]), 3);
});

test("the first tag is never hidden even when the row still wraps", () => {
  assert.equal(hiddenTraitCount([3, 2, 2]), 2);
  assert.equal(hiddenTraitCount([2]), 0);
});

test("lines are distinct tops within 2 px", () => {
  assert.equal(countLines([0, 1, 2, 20, 21, 40]), 3);
  assert.equal(countLines([]), 0);
});

test("the more label counts traits and hidden warnings with Polish plurals", () => {
  assert.equal(text.moreTraits(1, 0), "+1: pokaż jeszcze 1 cechę");
  assert.equal(
    text.moreTraits(2, 1),
    "+2: pokaż jeszcze 2 cechy, w tym ostrzeżenie",
  );
  assert.equal(
    text.moreTraits(5, 2),
    "+5: pokaż jeszcze 5 cech, w tym 2 ostrzeżenia",
  );
  assert.equal(
    text.moreTraits(22, 5),
    "+22: pokaż jeszcze 22 cechy, w tym 5 ostrzeżeń",
  );
  assert.equal(text.collapseTraits, "Zwiń");
  assert.equal(text.collapseTraitsName, "Zwiń cechy");
});
