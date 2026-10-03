import test from "node:test";
import assert from "node:assert/strict";
import { effectChips, eventOrdinal } from "./event-model.ts";

test("effect chips invert fitness into risk and skip zero", () => {
  assert.deepEqual(effectChips({ fit: 4, quality: -1 }), [
    { metric: "risk", direction: "down", good: true },
    { metric: "quality", direction: "down", good: false },
  ]);
  assert.deepEqual(effectChips({ quality: 2, fit: -1 }), [
    { metric: "risk", direction: "up", good: false },
    { metric: "quality", direction: "up", good: true },
  ]);
  assert.deepEqual(effectChips({ chem: 3, quality: 0 }), [
    { metric: "chemistry", direction: "up", good: true },
  ]);
  assert.deepEqual(effectChips({ chem: -2 }), [
    { metric: "chemistry", direction: "down", good: false },
  ]);
});

test("event ordinal from the event list", () => {
  assert.deepEqual(eventOrdinal("doctor"), {
    atPlayers: 9,
    index: 1,
    total: 3,
  });
  assert.deepEqual(eventOrdinal("captain"), {
    atPlayers: 17,
    index: 2,
    total: 3,
  });
  assert.deepEqual(eventOrdinal("scout"), {
    atPlayers: 22,
    index: 3,
    total: 3,
  });
});
