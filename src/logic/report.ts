import { GAME_RULES } from "../data/constants.ts";
import type { FinalReport, GameState, OutcomeId } from "../data/types.ts";
import { evaluateSquad } from "./results.ts";
import type { Evaluation } from "./results.ts";
import { squadLimit } from "./selection.ts";
import { tournamentStory } from "./tournament.ts";
import type { TournamentCopy } from "./tournament.ts";

type ReasonId =
  | "qualityHigh"
  | "qualityLow"
  | "chemHigh"
  | "chemLow"
  | "testedHigh"
  | "testedLow"
  | "coverageHigh"
  | "coverageLow"
  | "fitnessHigh"
  | "fitnessLow";

export interface ReportCopy {
  outcomes: Readonly<Record<OutcomeId, string>>;
  resultReasons: Readonly<
    Record<Exclude<ReasonId, "testedHigh" | "testedLow">, string> & {
      testedHigh: (count: number) => string;
      testedLow: (count: number) => string;
    }
  >;
  tournament: TournamentCopy;
}

export interface ReportReasons {
  strengths: ReasonId[];
  weak: ReasonId[];
}

export function reportReasons(evaluation: Evaluation): ReportReasons {
  const rules = GAME_RULES.tournament;
  const checks: [boolean, ReasonId, ReasonId][] = [
    [
      evaluation.quality >= rules.qualityStrengthThresholdPoints,
      "qualityHigh",
      "qualityLow",
    ],
    [
      evaluation.chem >= rules.chemistryStrengthThresholdPoints,
      "chemHigh",
      "chemLow",
    ],
    [
      evaluation.testedPlayers >= rules.testedStrengthThresholdPlayers,
      "testedHigh",
      "testedLow",
    ],
    [
      evaluation.coverage >= GAME_RULES.ratingMaximumPoints,
      "coverageHigh",
      "coverageLow",
    ],
    [
      evaluation.fit >= rules.fitnessStrengthThresholdPoints,
      "fitnessHigh",
      "fitnessLow",
    ],
  ];
  return {
    strengths: checks.filter(([strong]) => strong).map(([, high]) => high),
    weak: checks.filter(([strong]) => !strong).map(([, , low]) => low),
  };
}

function reasonText(
  reason: ReasonId,
  evaluation: Evaluation,
  state: GameState,
  copy: ReportCopy["resultReasons"],
): string {
  if (reason === "testedHigh") return copy.testedHigh(evaluation.testedPlayers);
  if (reason === "testedLow")
    return copy.testedLow(squadLimit(state) - evaluation.testedPlayers);
  return copy[reason];
}

// Evaluates the final squad and writes the tournament report. Returns the seed after the last
// draw so the reducer can store it with the report.
export function buildFinalReport(
  state: GameState,
  copy: ReportCopy,
): { report: FinalReport; seed: number } {
  const evaluation = evaluateSquad(state);
  const reasons = reportReasons(evaluation);
  const toText = (reason: ReasonId) =>
    reasonText(reason, evaluation, state, copy.resultReasons);
  const stage = copy.outcomes[evaluation.outcome];
  const story = tournamentStory(
    stage,
    evaluation.points,
    evaluation.seed,
    copy.tournament,
  );
  return {
    report: {
      squadIds: evaluation.squad.map((player) => player.id),
      quality: evaluation.quality,
      chem: evaluation.chem,
      coverage: evaluation.coverage,
      luck: evaluation.luck,
      points: evaluation.points,
      stage,
      grade: evaluation.grade,
      strengths: reasons.strengths.map(toText),
      weak: reasons.weak.map(toText),
      story,
    },
    seed: story.seed,
  };
}
