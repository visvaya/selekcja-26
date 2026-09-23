import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import { fillSquadRandomly } from "./random-squad.ts";
import { createInitialState, reduceGameState } from "./state.ts";
import { canFinalize } from "./selection.ts";

test("seeded random selection preserves picks and meets camp requirements", () => {
  const state = createInitialState(123);
  state.selected.add(players[0]!.name);
  const first = fillSquadRandomly(state);
  const second = fillSquadRandomly(state);
  assert.deepEqual(first, second);
  assert.equal(state.selected.size, 1);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.ok(first.selected.has(players[0]!.name));
  assert.equal(first.selected.size, GAME_RULES.camp.squadSizePlayers);
  assert.ok(canFinalize({ ...state, selected: first.selected }));
  const filled = reduceGameState(state, { type: "autoFill", ...first });
  const restored = reduceGameState(filled, { type: "undo" });
  assert.deepEqual(restored, state);
});

test("random selection fills final squad with exactly three goalkeepers", () => {
  const state = { ...createInitialState(98), stage: "final" as const };
  const result = fillSquadRandomly(state);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(canFinalize({ ...state, selected: result.selected }));
  assert.equal(
    players.filter(
      (player) => player.pos === "BR" && result.selected.has(player.id),
    ).length,
    3,
  );
});

test("random selection rejects impossible proportions without changing state", () => {
  const state = createInitialState(24);
  state.selected = new Set(
    players
      .filter((player) => player.pos === "OBR")
      .slice(0, 18)
      .map((player) => player.id),
  );
  const result = fillSquadRandomly(state);
  assert.deepEqual(result, { ok: false, reason: "insufficientSlots" });
  assert.equal(state.seed, 24);
});
