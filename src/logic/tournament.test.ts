import test from "node:test";
import assert from "node:assert/strict";
import { GAME_RULES } from "../data/constants.ts";
import type { MatchResultId, MatchScore, OutcomeId } from "../data/types.ts";
import { tournamentStory } from "./tournament.ts";
import { UI_TEXT } from "../ui/text.ts";

const POINTS_BY_OUTCOME: [OutcomeId, number][] = [
  ["champion", 9],
  ["runnerUp", 7],
  ["semifinal", 7],
  ["quarterfinal", 5],
  ["roundOf16", 5],
  ["group", 3],
  ["group", 1],
  ["group", 0],
];
const ROUNDS_BY_OUTCOME: Record<OutcomeId, number> = {
  group: 0,
  roundOf16: 1,
  quarterfinal: 2,
  semifinal: 3,
  runnerUp: 4,
  champion: 4,
};
const resultOf = (m: MatchScore): MatchResultId =>
  m.goalsFor > m.goalsAgainst
    ? "win"
    : m.goalsFor < m.goalsAgainst
      ? "loss"
      : "draw";
const POINTS: Record<MatchResultId, number> = { win: 3, draw: 1, loss: 0 };

test("group matches agree with the points, opponents never repeat", () => {
  for (const [outcome, points] of POINTS_BY_OUTCOME)
    for (let seed = 1; seed <= 2000; seed += 1) {
      const story = tournamentStory(outcome, points, seed, UI_TEXT.tournament);
      assert.equal(story.groupMatches.length, 3);
      assert.equal(
        story.groupMatches.reduce((sum, m) => sum + POINTS[resultOf(m)], 0),
        points,
      );
      assert.equal(story.knockout.length, ROUNDS_BY_OUTCOME[outcome]);
      const opponents = [...story.groupMatches, ...story.knockout].map(
        (m) => m.opponent,
      );
      assert.equal(new Set(opponents).size, opponents.length);
      story.knockout.forEach((match, index) => {
        const last = index === story.knockout.length - 1;
        const won = match.penalties
          ? match.penalties.goalsFor > match.penalties.goalsAgainst
          : resultOf(match) === "win";
        assert.equal(won, !last || outcome === "champion");
      });
    }
});

test("every outcome band has group results that sum to its points", () => {
  const byPoints = GAME_RULES.tournament.groupResultsByPoints;
  for (const band of GAME_RULES.tournament.outcomeBands)
    assert.ok(byPoints[band.groupPoints]?.length, `${band.groupPoints} pts`);
  for (const [key, combinations] of Object.entries(byPoints))
    for (const combination of combinations) {
      assert.equal(combination.length, GAME_RULES.groupMatchesCount);
      assert.equal(
        combination.reduce((sum, result) => sum + POINTS[result], 0),
        Number(key),
      );
    }
});

// Seeds 1..200 all draw the first combination: their first LCG step stays below 2^31, so a
// two-way draw always yields 0. Real seeds span the 32-bit range, as these 200 do.
const SPREAD_SEED_STEP = 21_474_836;

test("three points can come from either combination", () => {
  const shapes = new Set<string>();
  for (let index = 1; index <= 200; index += 1) {
    const seed = index * SPREAD_SEED_STEP;
    const story = tournamentStory("group", 3, seed, UI_TEXT.tournament);
    shapes.add(story.groupMatches.map(resultOf).sort().join(","));
  }
  assert.deepEqual([...shapes].sort(), ["draw,draw,draw", "loss,loss,win"]);
});

test("the same seed tells the same story and returns the advanced seed", () => {
  const first = tournamentStory("champion", 9, 12345, UI_TEXT.tournament);
  assert.deepEqual(
    first,
    tournamentStory("champion", 9, 12345, UI_TEXT.tournament),
  );
  assert.notEqual(first.seed, 12345);
  assert.equal(first.groupPoints, 9);
  assert.deepEqual(
    first.knockout.map((match) => match.round),
    ["roundOf16", "quarterfinal", "semifinal", "final"],
  );
  assert.equal(first.outcome, "Polska została mistrzem Europy.");
  assert.match(
    tournamentStory("semifinal", 7, 1, UI_TEXT.tournament).outcome,
    /odpadła w półfinale/,
  );
});

test("an unknown points value throws", () => {
  assert.throws(
    () => tournamentStory("group", 2, 1, UI_TEXT.tournament),
    Error,
  );
});
