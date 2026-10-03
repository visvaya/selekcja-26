import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { createInitialState, reduceGameState } from "./state.ts";
import { canSelectBoth, squadQuality } from "./selection.ts";

test("squad quality is null for an empty squad", () => {
  assert.equal(squadQuality(createInitialState(3)), null);
});

test("squad quality is the rounded mean plus the quality effect", () => {
  const [a, b] = [players[0]!, players[1]!];
  const state = reduceGameState(createInitialState(3), {
    type: "selectBoth",
    ids: [a.id, b.id],
    limit: 23,
  });
  const withEffect = { ...state, effects: { ...state.effects, quality: 2 } };
  assert.equal(squadQuality(withEffect), Math.round((a.ov + b.ov) / 2 + 2));
});

test("canSelectBoth reports absent, blocked and ready", () => {
  const ids = [players[0]!.id, players[1]!.id] as const;
  const empty = createInitialState(3);
  assert.equal(canSelectBoth(empty, ids, 23), "ready");
  assert.equal(canSelectBoth(empty, ids, 1), "blocked");
  const withA = reduceGameState(empty, {
    type: "togglePlayer",
    id: ids[1],
    limit: 23,
  });
  assert.equal(canSelectBoth(withA, ids, 1), "absent");
});
