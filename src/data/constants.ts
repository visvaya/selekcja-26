import type { MatchResultId, MatchScore, OutcomeId } from "./types.ts";

// A frozen match score; the optional pair is a penalty shoot-out after a draw.
function score(
  goalsFor: number,
  goalsAgainst: number,
  penaltiesFor?: number,
  penaltiesAgainst?: number,
): MatchScore {
  return Object.freeze({
    goalsFor,
    goalsAgainst,
    penalties:
      penaltiesFor === undefined || penaltiesAgainst === undefined
        ? null
        : Object.freeze({
            goalsFor: penaltiesFor,
            goalsAgainst: penaltiesAgainst,
          }),
  });
}

export const GAME_RULES = Object.freeze({
  undoHistoryLimitActions: 50,
  camp: {
    squadSizePlayers: 23,
    minimumPlayersByGroup: { BR: 2, OBR: 7, POM: 7, ATA: 3 },
  },
  final: {
    squadSizePlayers: 26,
    minimumPlayersByGroup: { BR: 3, OBR: 8, POM: 8, ATA: 4 },
  },
  groupMatchesCount: 3,
  eventThresholdPlayers: { doctor: 9, captain: 17, scout: 22 },
  campTrial: {
    minimumDeltaPoints: -4,
    maximumDeltaPoints: 5,
    formBaselinePoints: 80,
    formDivisorPoints: 6,
    randomRangePoints: 7,
    randomOffsetPoints: 3,
    impressedThresholdPoints: 3,
    solidThresholdPoints: 0,
    uncertainThresholdPoints: -2,
  },
  risk: {
    flagPenaltyPoints: 12,
    lowThresholdPoints: 14,
    mediumThresholdPoints: 22,
  },
  ratingMaximumPoints: 100,
  selection: {
    experienceMaximumPoints: 90,
    experienceBasePoints: 52,
    experienceYearCap: 13,
    experienceYearsStartingAt: 19,
    experiencePointsPerYear: 2.2,
    experienceRoleBonusPoints: 5,
    leaderRoleBonusPoints: 4,
    groupMaximumPoints: 98,
    groupLeaderBonusPoints: 8,
    groupExperienceBonusPoints: 4,
    availabilityInjuryPenaltyPoints: 5,
    availabilityMinutesPenaltyPoints: 4,
    maximumScorePoints: 99,
    trialImpactMaximumPoints: 2,
    trialImpactMultiplier: 0.4,
    balanced: {
      rhythmFormWeight: 0.72,
      rhythmFitnessWeight: 0.28,
      roleTacticsBonusPoints: 3.5,
      tacticalMaximumPoints: 99,
      nationalMaximumPoints: 98,
      nationalExperienceBonusPoints: 5,
      nationalLeaderBonusPoints: 4,
      rhythmWeight: 0.28,
      qualityWeight: 0.24,
      experienceWeight: 0.08,
      nationalWeight: 0.08,
      groupWeight: 0.08,
      tacticalWeight: 0.24,
    },
  },
  tournament: {
    qualityWeight: 0.29,
    formWeight: 0.21,
    fitnessWeight: 0.12,
    chemistryWeight: 0.17,
    roleCoverageWeight: 0.16,
    campChemistryBonusDivisorPlayers: 13,
    luckRangePoints: 12,
    qualityStrengthThresholdPoints: 81,
    chemistryStrengthThresholdPoints: 83,
    testedStrengthThresholdPlayers: 18,
    fitnessStrengthThresholdPoints: 86,
    favorableLuckThresholdPoints: 3,
    unfavorableLuckThresholdPoints: -3,
    // Group results for each points total; the order is shuffled when the story is drawn.
    groupResultsByPoints: {
      9: [["win", "win", "win"]],
      7: [["win", "win", "draw"]],
      5: [["win", "draw", "draw"]],
      3: [
        ["win", "loss", "loss"],
        ["draw", "draw", "draw"],
      ],
      1: [["draw", "loss", "loss"]],
      0: [["loss", "loss", "loss"]],
    } satisfies Record<number, MatchResultId[][]> as Readonly<
      Record<number, readonly (readonly MatchResultId[])[]>
    >,
    scores: {
      wins: [score(2, 0), score(2, 1), score(1, 0)],
      draws: [score(0, 0), score(1, 1), score(2, 2)],
      losses: [score(0, 1), score(1, 2), score(0, 2)],
      quarterfinalLosses: [score(1, 1, 3, 4), score(0, 1), score(1, 2)],
    },
    outcomeBands: [
      {
        minimumScorePoints: 91,
        groupPoints: 9,
        outcome: "champion",
        grade: "6",
      },
      {
        minimumScorePoints: 89,
        groupPoints: 7,
        outcome: "runnerUp",
        grade: "5",
      },
      {
        minimumScorePoints: 87,
        groupPoints: 7,
        outcome: "semifinal",
        grade: "5",
      },
      {
        minimumScorePoints: 84,
        groupPoints: 5,
        outcome: "quarterfinal",
        grade: "4+",
      },
      {
        minimumScorePoints: 80,
        groupPoints: 5,
        outcome: "roundOf16",
        grade: "4",
      },
      { minimumScorePoints: 77, groupPoints: 3, outcome: "group", grade: "3+" },
      { minimumScorePoints: 75, groupPoints: 1, outcome: "group", grade: "3" },
      {
        minimumScorePoints: Number.NEGATIVE_INFINITY,
        groupPoints: 0,
        outcome: "group",
        grade: "2",
      },
    ] satisfies {
      minimumScorePoints: number;
      groupPoints: number;
      outcome: OutcomeId;
      grade: string;
    }[],
  },
});

// Revision of the game rules, independent of the save schema version and of any player-facing
// version number. Bump it for every change that alters a result for the same seed and the same
// decisions: squad limits and quotas, candidates and their ratings, formations and roles, camp
// events, scoring, outcome bands, the random generator, and the score and opponent lists that
// the tournament story is drawn from. Other UI copy does not bump it. The golden master
// (src/logic/golden-master.test.ts) fails when traces change without a bump. A save from another
// revision keeps only a finished report (frozen, no undo); an unfinished game is discarded with a
// notice.
export const RULES_REVISION = 2;

// Application configuration that is not a gameplay rule.
export const APP_CONFIG = Object.freeze({
  // Opening the game with ?reset in the URL discards the saved game and starts fresh.
  saveResetQueryParam: "reset",
  // Saved games live under this key. Never rename it without a migration of existing saves.
  storageKey: "selekcja-26-game",
  // Shape of the saved game. Bump it only together with an explicit migration in src/logic.
  saveSchemaVersion: 4,
  // Used when the browser offers no crypto source for a fresh game seed.
  fallbackSeed: 2028,
});
