import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { createInitialState, reduceGameState } from "./state.ts";

test("selection and comparison do not mutate previous state", () => {
  const initial = createInitialState(15);
  const selected = reduceGameState(initial, {
    type: "togglePlayer",
    name: "A",
    limit: 23,
  });
  assert.equal(initial.selected.size, 0);
  assert.equal(selected.selected.size, 1);
  const compared = reduceGameState(selected, {
    type: "toggleCompare",
    name: "A",
  });
  assert.deepEqual(selected.compare, []);
  assert.deepEqual(compared.compare, ["A"]);
});

test("camp results are reproducible from a seed", () => {
  const state = reduceGameState(createInitialState(42), {
    type: "togglePlayer",
    name: "A",
    limit: 23,
  });
  const action = { type: "completeCamp" as const, squad: [players[0]!] };
  assert.deepEqual(
    reduceGameState(state, action),
    reduceGameState(state, action),
  );
  assert.equal(state.stage, "camp");
});

test("undo reverses one decision at a time without tracking search", () => {
  const started = reduceGameState(createInitialState(4), { type: "start" });
  const picked = reduceGameState(started, {
    type: "togglePlayer",
    name: "A",
    limit: 23,
  });
  const searched = reduceGameState(picked, { type: "setQuery", value: "A" });
  const reverted = reduceGameState(searched, { type: "undo" });
  assert.equal(reverted.selected.size, 0);
  assert.equal(reverted.query, "A");
  assert.equal(reverted.started, true);
  assert.equal(reduceGameState(reverted, { type: "undo" }).started, false);
});
