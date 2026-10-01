import { GAME_RULES } from "../data/constants.ts";
import type {
  GroupMatch,
  KnockoutMatch,
  KnockoutRoundId,
  MatchResultId,
  MatchScore,
  OutcomeId,
  TournamentStory,
} from "../data/types.ts";
import { randomInt } from "./random.ts";

export interface TournamentCopy {
  groupOpponents: readonly string[]; // at least 4
  knockoutOpponents: readonly string[]; // at least 3
  outcomeSentence: (outcome: OutcomeId) => string;
}

const KNOCKOUT_ROUNDS: readonly KnockoutRoundId[] = [
  "roundOf16",
  "quarterfinal",
  "semifinal",
  "final",
];

// The last knockout round played for each outcome; null after a group exit.
const ENDING_ROUND: Readonly<Record<OutcomeId, KnockoutRoundId | null>> = {
  group: null,
  roundOf16: "roundOf16",
  quarterfinal: "quarterfinal",
  semifinal: "semifinal",
  runnerUp: "final",
  champion: "final",
};

const SCORES_BY_RESULT: Readonly<Record<MatchResultId, readonly MatchScore[]>> =
  {
    win: GAME_RULES.tournament.scores.wins,
    draw: GAME_RULES.tournament.scores.draws,
    loss: GAME_RULES.tournament.scores.losses,
  };

function copyScore(score: MatchScore): MatchScore {
  return {
    goalsFor: score.goalsFor,
    goalsAgainst: score.goalsAgainst,
    penalties: score.penalties ? { ...score.penalties } : null,
  };
}

// Draws the tournament path: three group matches whose results add up to the group points, then
// the knockout rounds up to the one that ends the tournament. Opponents never repeat, and every
// draw advances the seed in a fixed order, so the same seed always tells the same story.
export function tournamentStory(
  outcome: OutcomeId,
  points: number,
  initialSeed: number,
  copy: TournamentCopy,
): TournamentStory {
  const combinations = GAME_RULES.tournament.groupResultsByPoints[points];
  if (!combinations?.length)
    throw new Error(`No group results for ${points} points`);
  let seed = initialSeed;
  const draw = (count: number): number => {
    const next = randomInt(seed, count);
    seed = next.seed;
    return next.value;
  };
  const pickScore = (scores: readonly MatchScore[]): MatchScore =>
    copyScore(scores[draw(scores.length)]!);

  const combination =
    combinations.length > 1
      ? combinations[draw(combinations.length)]!
      : combinations[0]!;
  const results = [...combination];
  for (let index = results.length - 1; index > 0; index -= 1) {
    const swap = draw(index + 1);
    [results[index], results[swap]] = [results[swap]!, results[index]!];
  }

  const groupPool = [...copy.groupOpponents];
  const takeFrom = (pool: string[]): string =>
    pool.splice(draw(pool.length), 1)[0]!;
  const opponents = results.map(() => takeFrom(groupPool));
  const groupMatches: GroupMatch[] = results.map((result, index) => ({
    ...pickScore(SCORES_BY_RESULT[result]),
    opponent: opponents[index]!,
  }));

  const knockout: KnockoutMatch[] = [];
  const ending = ENDING_ROUND[outcome];
  if (ending) {
    const knockoutPool = [...copy.knockoutOpponents];
    for (const round of KNOCKOUT_ROUNDS) {
      const isLast = round === ending;
      const won = !isLast || outcome === "champion";
      const opponent = takeFrom(
        round === "roundOf16" ? groupPool : knockoutPool,
      );
      const scores = won
        ? GAME_RULES.tournament.scores.wins
        : round === "quarterfinal"
          ? GAME_RULES.tournament.scores.quarterfinalLosses
          : GAME_RULES.tournament.scores.losses;
      knockout.push({ ...pickScore(scores), round, opponent });
      if (isLast) break;
    }
  }

  return {
    groupPoints: points,
    groupMatches,
    knockout,
    outcome: copy.outcomeSentence(outcome),
    seed,
  };
}
