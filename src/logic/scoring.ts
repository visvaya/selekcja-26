import { systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, Player } from "../data/types.ts";

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
        (player.roles.includes("Doświadczenie")
          ? rule.experienceRoleBonusPoints
          : 0) +
        (player.roles.includes("Lider") ? rule.leaderRoleBonusPoints : 0),
    ),
  );
}

export function groupScore(player: Player): number {
  const rule = GAME_RULES.selection;
  return Math.min(
    rule.groupMaximumPoints,
    player.chem +
      (player.roles.includes("Lider") ? rule.groupLeaderBonusPoints : 0) +
      (player.roles.includes("Doświadczenie")
        ? rule.groupExperienceBonusPoints
        : 0),
  );
}

export function trialImpact(player: Player, state: GameState): number {
  const report = state.trial[player.name];
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
        (player.roles.includes("Doświadczenie")
          ? weights.nationalExperienceBonusPoints
          : 0) +
        (player.roles.includes("Lider")
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
  base -= player.flags.includes("Ryzyko urazu")
    ? rule.availabilityInjuryPenaltyPoints
    : player.flags.includes("Limit minut")
      ? rule.availabilityMinutesPenaltyPoints
      : player.flags
        ? rule.availabilityOtherPenaltyPoints
        : 0;
  if (state.stage === "final") base += trialImpact(player, state);
  return Math.min(rule.maximumScorePoints, Math.round(base));
}
