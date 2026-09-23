import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { createInitialState } from "./state.ts";
import { modelScore } from "./scoring.ts";

test("veterans do not receive inflated selection scores", () => {
  const state = createInitialState();
  for (const name of ["Paweł Wszołek", "Kamil Grosicki"]) {
    const player = players.find((candidate) => candidate.name === name);
    assert.ok(player && modelScore(player, state) < 90);
  }
});
