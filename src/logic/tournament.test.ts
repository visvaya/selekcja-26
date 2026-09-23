import test from "node:test";
import assert from "node:assert/strict";
import { tournamentStory } from "./tournament.ts";
import { UI_TEXT } from "../ui/text.ts";

const cases: [string, number][] = [
  ["Faza grupowa", 2],
  ["1/8 finału", 2],
  ["Ćwierćfinał", 3],
  ["Półfinał", 4],
  ["Wicemistrz Europy", 5],
  ["Mistrz Europy", 5],
];
for (const [stage, rounds] of cases) {
  test(`tournament story is consistent at ${stage}`, () => {
    const first = tournamentStory(stage, 5, 12345, UI_TEXT.tournament);
    assert.deepEqual(
      first,
      tournamentStory(stage, 5, 12345, UI_TEXT.tournament),
    );
    assert.equal(first.matches.length, rounds);
    assert.ok(first.matches.at(-1)?.includes(first.last));
    if (stage === "Półfinał")
      assert.match(first.outcome, /odpadła w półfinale/);
  });
}
