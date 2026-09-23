import { randomInt } from "./random.ts";
import type { TournamentStory } from "../data/types.ts";

export interface TournamentCopy {
  groupOpponents: readonly string[];
  knockoutOpponents: readonly string[];
  wins: readonly string[];
  losses: readonly string[];
  quarterfinalLosses: readonly string[];
  groupExit: readonly string[];
  groupPoints: (points: number) => string;
  match: (score: string, opponent: string) => string;
  round: (name: string, match: string) => string;
  groupLast: (match: string) => string;
  groupOutcome: string;
  championOutcome: string;
  runnerUpOutcome: string;
  eliminated: (stage: string) => string;
  rounds: readonly string[];
  groupStage: string;
  championStage: string;
  runnerUpStage: string;
  semifinalStage: string;
  quarterfinalStage: string;
}

export function tournamentStory(
  stage: string,
  points: number,
  initialSeed: number,
  copy: TournamentCopy,
): TournamentStory {
  let seed = initialSeed;
  const pick = (items: readonly string[]): string => {
    const draw = randomInt(seed, items.length);
    seed = draw.seed;
    return items[draw.value]!;
  };
  const matches = [copy.groupPoints(points)];
  let last = "";
  let outcome = "";

  if (stage === copy.groupStage) {
    last = copy.match(
      pick(points <= 1 ? copy.losses : copy.groupExit),
      pick(copy.groupOpponents),
    );
    matches.push(copy.groupLast(last));
    outcome = copy.groupOutcome;
  } else {
    const ending =
      stage === copy.championStage || stage === copy.runnerUpStage
        ? copy.rounds.at(-1)
        : stage;
    for (const round of copy.rounds) {
      const isLast = round === ending;
      const won = !isLast || stage === copy.championStage;
      const scores = won
        ? copy.wins
        : round === copy.quarterfinalStage
          ? copy.quarterfinalLosses
          : copy.losses;
      const opponent = pick(
        round === copy.rounds[0] ? copy.groupOpponents : copy.knockoutOpponents,
      );
      last = copy.match(pick(scores), opponent);
      matches.push(copy.round(round, last));
      if (isLast) break;
    }
    outcome =
      stage === copy.championStage
        ? copy.championOutcome
        : stage === copy.runnerUpStage
          ? copy.runnerUpOutcome
          : copy.eliminated(stage);
  }
  return { matches, outcome, last, seed };
}
