import { systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, OutcomeId, Player } from "../data/types.ts";
import { nextRandom } from "./random.ts";
import { selectedPlayers } from "./selection.ts";

export interface Evaluation {
  squad: Player[];
  testedPlayers: number;
  quality: number;
  form: number;
  fit: number;
  chem: number;
  coverage: number;
  luck: number;
  // Final score (base plus luck) compared with each band's minimumScorePoints.
  score: number;
  points: number;
  outcome: OutcomeId;
  grade: string;
  seed: number;
}

export function evaluateSquad(state: GameState): Evaluation {
  const squad = selectedPlayers(state);
  if (squad.length === 0) throw new Error("A squad is required for evaluation");
  const testedPlayers = squad.filter((player) =>
    state.campSquad.has(player.id),
  ).length;
  const quality =
    squad.reduce((total, player) => total + player.ov, 0) / squad.length;
  const form =
    squad.reduce(
      (total, player) =>
        total + player.form + (state.trial[player.id]?.delta ?? 0),
      0,
    ) / squad.length;
  const fit =
    squad.reduce((total, player) => total + player.fit, 0) / squad.length +
    state.effects.fit;
  const rules = GAME_RULES.tournament;
  const chem =
    squad.reduce((total, player) => total + player.chem, 0) / squad.length +
    state.effects.chem +
    testedPlayers / rules.campChemistryBonusDivisorPlayers;
  const needs = systems.find((system) => system.id === state.system)!.needs;
  const coverage =
    (needs.filter((role) => squad.some((player) => player.roles.includes(role)))
      .length /
      needs.length) *
    100;
  const base =
    quality * rules.qualityWeight +
    form * rules.formWeight +
    fit * rules.fitnessWeight +
    chem * rules.chemistryWeight +
    coverage * rules.roleCoverageWeight +
    state.effects.quality;
  const draw = nextRandom(state.seed);
  const luck = Math.round((draw.value - 0.5) * rules.luckRangePoints);
  const score = base + luck;
  const band = rules.outcomeBands.find(
    (candidate) => score >= candidate.minimumScorePoints,
  )!;
  const result: { points: number; outcome: OutcomeId; grade: string } = {
    points: band.groupPoints,
    outcome: band.outcome,
    grade: band.grade,
  };
  return {
    squad,
    testedPlayers,
    quality,
    form,
    fit,
    chem,
    coverage,
    luck,
    score,
    seed: draw.seed,
    ...result,
  };
}
