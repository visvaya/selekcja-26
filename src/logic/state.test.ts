import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { createInitialState, reduceGameState } from "./state.ts";

test("selection and comparison do not mutate previous state", () => {
  const initial = createInitialState(15);
  const selected = reduceGameState(initial, {
    type: "togglePlayer",
    id: "A",
    limit: 23,
  });
  assert.equal(initial.selected.size, 0);
  assert.equal(selected.selected.size, 1);
  const compared = reduceGameState(selected, {
    type: "toggleCompare",
    id: "A",
  });
  assert.deepEqual(selected.compare, []);
  assert.deepEqual(compared.compare, ["A"]);
});

test("camp results are reproducible from a seed", () => {
  const state = reduceGameState(createInitialState(42), {
    type: "togglePlayer",
    id: "A",
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
    id: "A",
    limit: 23,
  });
  const searched = reduceGameState(picked, {
    type: "setList",
    patch: { query: "A" },
  });
  const reverted = reduceGameState(searched, { type: "undo" });
  assert.equal(reverted.selected.size, 0);
  assert.equal(reverted.list.query, "A");
  assert.equal(reverted.started, true);
  assert.equal(reduceGameState(reverted, { type: "undo" }).started, false);
});

test("list filters stay outside undo history", () => {
  const started = reduceGameState(createInitialState(1), { type: "start" });
  const filtered = reduceGameState(started, {
    type: "setList",
    patch: { positions: ["LS"], traits: ["pace"], onlySelected: true },
  });
  assert.equal(filtered.history.length, started.history.length);
  const picked = reduceGameState(filtered, {
    type: "togglePlayer",
    id: "robert-lewandowski",
    limit: 23,
  });
  const undone = reduceGameState(picked, { type: "undo" });
  assert.deepEqual(undone.list, filtered.list);
  assert.equal(undone.selected.has("robert-lewandowski"), false);
});

test("clearSquad empties the squad as one undo step and keeps the rest", () => {
  let state = reduceGameState(createInitialState(7), { type: "start" });
  for (const player of players.slice(0, 3))
    state = reduceGameState(state, {
      type: "togglePlayer",
      id: player.id,
      limit: 23,
    });
  const cleared = reduceGameState(state, { type: "clearSquad" });
  assert.equal(cleared.selected.size, 0);
  assert.equal(cleared.history.length, state.history.length + 1);
  assert.equal(cleared.campSquad === state.campSquad, true);
  assert.equal(cleared.trial === state.trial, true);
  assert.equal(cleared.events === state.events, true);
  assert.equal(cleared.effects === state.effects, true);
  assert.equal(cleared.list === state.list, true);
  assert.equal(cleared.compare === state.compare, true);
  assert.equal(state.selected.size, 3);
  const undone = reduceGameState(cleared, { type: "undo" });
  assert.deepEqual([...undone.selected], [...state.selected]);
  const empty = reduceGameState(createInitialState(7), { type: "start" });
  assert.equal(reduceGameState(empty, { type: "clearSquad" }) === empty, true);
});

const campIds = players.map((player) => player.id);
const startedCamp = () =>
  reduceGameState(createInitialState(7), { type: "start" });
const campWith = (count: number) =>
  campIds
    .slice(0, count)
    .reduce(
      (state, id) =>
        reduceGameState(state, { type: "togglePlayer", id, limit: 23 }),
      startedCamp(),
    );

test("selectBoth adds both players in one undo step", () => {
  const [a, b] = [campIds[0]!, campIds[1]!];
  const state = startedCamp();
  const next = reduceGameState(state, {
    type: "selectBoth",
    ids: [a, b],
    limit: 23,
  });
  assert.deepEqual([...next.selected].sort(), [a, b].sort());
  assert.equal(next.history.length, state.history.length + 1);
  assert.equal(next.compare, state.compare);
  const undone = reduceGameState(next, { type: "undo" });
  assert.equal(undone.selected.size, state.selected.size);
});

test("selectBoth changes nothing when either is selected or places are short", () => {
  const [a, b] = [campIds[0]!, campIds[1]!];
  const withA = reduceGameState(startedCamp(), {
    type: "togglePlayer",
    id: a,
    limit: 23,
  });
  assert.equal(
    reduceGameState(withA, { type: "selectBoth", ids: [a, b], limit: 23 }) ===
      withA,
    true,
  );
  assert.equal(
    reduceGameState(withA, { type: "selectBoth", ids: [b, a], limit: 23 }) ===
      withA,
    true,
  );
  const twentyTwo = campWith(22);
  const [c, d] = [campIds[30]!, campIds[31]!];
  assert.equal(
    reduceGameState(twentyTwo, {
      type: "selectBoth",
      ids: [c, d],
      limit: 23,
    }) === twentyTwo,
    true,
  );
  assert.equal(
    reduceGameState(campWith(21), {
      type: "selectBoth",
      ids: [c, d],
      limit: 23,
    }).selected.size,
    23,
  );
});

test("removePlayers removes only selected listed players in one step", () => {
  const state = campWith(5);
  const ids = [...state.selected].slice(0, 2);
  const next = reduceGameState(state, {
    type: "removePlayers",
    ids: [...ids, "unknown-id"],
  });
  assert.equal(next.selected.size, 3);
  assert.equal(
    ids.some((id) => next.selected.has(id)),
    false,
  );
  assert.equal(state.selected.size, 5);
  assert.equal(next.history.length, state.history.length + 1);
  assert.equal(
    reduceGameState(state, { type: "removePlayers", ids: ["unknown-id"] }) ===
      state,
    true,
  );
});
