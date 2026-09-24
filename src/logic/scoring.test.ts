import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import { createInitialState } from "./state.ts";
import { modelScore, trialNote } from "./scoring.ts";

test("veterans do not receive inflated selection scores", () => {
  const state = createInitialState();
  for (const name of ["Paweł Wszołek", "Kamil Grosicki"]) {
    const player = players.find((candidate) => candidate.name === name);
    assert.ok(player && modelScore(player, state) < 90);
  }
});

test("trialNote classifies a delta by the campTrial thresholds", () => {
  const rules = GAME_RULES.campTrial;
  assert.equal(trialNote(rules.maximumDeltaPoints), "impressed");
  assert.equal(trialNote(rules.impressedThresholdPoints), "impressed");
  assert.equal(trialNote(rules.impressedThresholdPoints - 1), "solid");
  assert.equal(trialNote(rules.solidThresholdPoints), "solid");
  assert.equal(trialNote(rules.solidThresholdPoints - 1), "uncertain");
  assert.equal(trialNote(rules.uncertainThresholdPoints), "uncertain");
  assert.equal(trialNote(rules.uncertainThresholdPoints - 1), "disappointed");
  assert.equal(trialNote(rules.minimumDeltaPoints), "disappointed");
});
