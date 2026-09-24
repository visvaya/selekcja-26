import { systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player, TrialNoteId } from "../data/types.ts";

// Pure classification of a trial delta into its note, by the thresholds in
// GAME_RULES.campTrial. delta is the source of truth (a seeded random draw); note is always
// derivable from it, so this is also used to recompute note on load instead of trusting a save.
export function trialNote(deltaPoints: number): TrialNoteId {
  const rules = GAME_RULES.campTrial;
  if (deltaPoints >= rules.impressedThresholdPoints) return "impressed";
  if (deltaPoints >= rules.solidThresholdPoints) return "solid";
  if (deltaPoints >= rules.uncertainThresholdPoints) return "uncertain";
  return "disappointed";
}

export function experienceScore(player: Player): number {
  const rule = GAME_RULES.selection;
  return Math.min(
    rule.experienceMaximumPoints,
    Math.round(
      rule.experienceBasePoints +
        Math.min(
          rule.experienceYearCap,
          Math.max(0, player.age - rule.experienceYearsStartingAt),
        ) *
          rule.experiencePointsPerYear +
        (player.roles.includes("experience")
          ? rule.experienceRoleBonusPoints
          : 0) +
        (player.roles.includes("leader") ? rule.leaderRoleBonusPoints : 0),
    ),
  );
}

export function groupScore(player: Player): number {
  const rule = GAME_RULES.selection;
  return Math.min(
    rule.groupMaximumPoints,
    player.chem +
      (player.roles.includes("leader") ? rule.groupLeaderBonusPoints : 0) +
      (player.roles.includes("experience")
        ? rule.groupExperienceBonusPoints
        : 0),
  );
}

export function trialImpact(player: Player, state: GameState): number {
  const report = state.trial[player.id];
  const limit = GAME_RULES.selection.trialImpactMaximumPoints;
  return report
    ? Math.max(
        -limit,
        Math.min(
          limit,
          Math.round(report.delta * GAME_RULES.selection.trialImpactMultiplier),
        ),
      )
    : 0;
}

export function modelScore(player: Player, state: GameState): number {
  const system = systems.find((candidate) => candidate.id === state.system)!;
  const roleHits = player.roles.filter((role) =>
    system.needs.includes(role),
  ).length;
  let base;
  if (state.priority === "balance") {
    const weights = GAME_RULES.selection.balanced;
    const rhythm =
      player.form * weights.rhythmFormWeight +
      player.fit * weights.rhythmFitnessWeight;
    const national = Math.min(
      weights.nationalMaximumPoints,
      player.chem +
        (player.roles.includes("experience")
          ? weights.nationalExperienceBonusPoints
          : 0) +
        (player.roles.includes("leader")
          ? weights.nationalLeaderBonusPoints
          : 0),
    );
    const tactical = Math.min(
      weights.tacticalMaximumPoints,
      player.tact + roleHits * weights.roleTacticsBonusPoints,
    );
    base =
      rhythm * weights.rhythmWeight +
      player.ov * weights.qualityWeight +
      experienceScore(player) * weights.experienceWeight +
      national * weights.nationalWeight +
      groupScore(player) * weights.groupWeight +
      tactical * weights.tacticalWeight;
  } else {
    const weights = GAME_RULES.selection.other;
    base =
      player.ov * weights.qualityWeight +
      player.form * weights.formWeight +
      player.fit * weights.fitnessWeight +
      player.tact * weights.tacticsWeight +
      player.chem * weights.chemistryWeight +
      roleHits * weights.roleBonusPoints;
    if (state.priority === "form")
      base +=
        player.form * weights.formPriorityFormWeight -
        player.ov * weights.formPriorityQualityPenaltyWeight;
    if (state.priority === "quality")
      base +=
        player.ov * weights.qualityPriorityQualityWeight -
        player.form * weights.qualityPriorityFormPenaltyWeight;
  }
  const rule = GAME_RULES.selection;
  base -=
    player.flag === "injuryRisk"
      ? rule.availabilityInjuryPenaltyPoints
      : player.flag === "minutesLimit"
        ? rule.availabilityMinutesPenaltyPoints
        : 0;
  if (state.stage === "final") base += trialImpact(player, state);
  return Math.min(rule.maximumScorePoints, Math.round(base));
}
