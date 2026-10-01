import test from "node:test";
import assert from "node:assert/strict";
import { GAME_RULES } from "../data/constants.ts";
import { fillSquadRandomly } from "./random-squad.ts";
import { evaluateSquad } from "./results.ts";
import { createInitialState, reduceGameState } from "./state.ts";

test("evaluateSquad exposes the score that picks the outcome band", () => {
  const started = reduceGameState(createInitialState(123456789), {
    type: "start",
  });
  const fill = fillSquadRandomly(started);
  assert.ok(fill.ok);
  const state = reduceGameState(started, {
    type: "autoFill",
    selected: fill.selected,
    seed: fill.seed,
  });
  const evaluation = evaluateSquad(state);
  assert.equal(typeof evaluation.score, "number");
  assert.ok(Number.isFinite(evaluation.score));
  const band = GAME_RULES.tournament.outcomeBands.find(
    (candidate) => evaluation.score >= candidate.minimumScorePoints,
  )!;
  assert.equal(evaluation.points, band.groupPoints);
  assert.equal(evaluation.outcome, band.outcome);
  assert.equal(evaluation.grade, band.grade);
});
