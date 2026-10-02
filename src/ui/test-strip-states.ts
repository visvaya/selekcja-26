import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { GameState, Player } from "../data/types.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";

// Shared fixtures for the strip tests: a catalogue player by ID and the two stages.
export function player(id: string): Player {
  const found = players.find((candidate) => candidate.id === id);
  assert.ok(found, id);
  return found;
}

export function campState(): GameState {
  return reduceGameState(createInitialState(7), { type: "start" });
}

export function finalState(trial: GameState["trial"]): GameState {
  const state = reduceGameState(campState(), {
    type: "completeCamp",
    squad: players.slice(0, 23),
  });
  return { ...state, trial };
}
