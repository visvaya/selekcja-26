import test from "node:test";
import assert from "node:assert/strict";
import type { OutcomeId } from "../data/types.ts";
import { UI_TEXT as text } from "./text.ts";

test("age uses the Polish plural form for the number of years", () => {
  const cases: [number, string][] = [
    [1, "1 rok"],
    [2, "2 lata"],
    [4, "4 lata"],
    [5, "5 lat"],
    [12, "12 lat"],
    [14, "14 lat"],
    [20, "20 lat"],
    [21, "21 lat"],
    [22, "22 lata"],
    [24, "24 lata"],
    [26, "26 lat"],
    [32, "32 lata"],
    [34, "34 lata"],
    [35, "35 lat"],
    [40, "40 lat"],
    [112, "112 lat"],
    [122, "122 lata"],
  ];
  for (const [years, expected] of cases)
    assert.equal(text.age(years), expected, `age(${years})`);
});

test("the report outcome sentence speaks of Poland as we, for every outcome", () => {
  const cases: [string, string][] = [
    [text.outcomes.group, "Zakończyliśmy udział w turnieju po fazie grupowej."],
    [text.outcomes.roundOf16, "Odpadliśmy w 1/8 finału."],
    [text.outcomes.quarterfinal, "Odpadliśmy w ćwierćfinale."],
    [text.outcomes.semifinal, "Odpadliśmy w półfinale."],
    [text.outcomes.runnerUp, "Zostaliśmy wicemistrzami Europy."],
    [text.outcomes.champion, "Zostaliśmy mistrzami Europy."],
  ];
  for (const [stage, expected] of cases)
    assert.equal(
      text.reportOutcome(stage),
      expected,
      `reportOutcome(${stage})`,
    );
});

test("an unknown report stage has no outcome sentence", () => {
  assert.equal(text.reportOutcome("Etap spoza listy"), undefined);
});

test("group points in the report speak of Poland as we", () => {
  assert.equal(text.pointsInGroup(5), "Zdobyliśmy 5 pkt w grupie.");
});

test("tournament scores and closing sentences read as before", () => {
  const t = text.tournament;
  assert.equal(
    t.score({ goalsFor: 2, goalsAgainst: 1, penalties: null }),
    "2:1",
  );
  assert.equal(
    t.score({
      goalsFor: 1,
      goalsAgainst: 1,
      penalties: { goalsFor: 3, goalsAgainst: 4 },
    }),
    "1:1, karne 3:4",
  );
  const sentences: [OutcomeId, string][] = [
    ["group", "Polska zakończyła udział w turnieju po fazie grupowej."],
    ["roundOf16", "Polska odpadła w 1/8 finału."],
    ["quarterfinal", "Polska odpadła w ćwierćfinale."],
    ["semifinal", "Polska odpadła w półfinale."],
    ["runnerUp", "Polska została wicemistrzem Europy."],
    ["champion", "Polska została mistrzem Europy."],
  ];
  for (const [outcome, expected] of sentences)
    assert.equal(t.outcomeSentence(outcome), expected, outcome);
});

// Records every UI string, and every text function's output for fixed sample arguments, so a
// reorganisation of the text module is proven not to change a single character.
const SNAPSHOT_URL = new URL("./text-snapshot.json", import.meta.url);
const SAMPLE_ARGUMENTS: readonly (number | string)[] = [
  0,
  1,
  2,
  5,
  12,
  22,
  "X",
  "Półfinał",
  "2026-10-01",
];

function snapshotValue(value: unknown): unknown {
  if (typeof value === "function")
    return SAMPLE_ARGUMENTS.map((sample) => {
      try {
        return String(
          (value as (...args: unknown[]) => unknown)(
            ...Array.from({ length: value.length }, () => sample),
          ),
        );
      } catch (error) {
        return `throws ${(error as Error).name}`;
      }
    });
  if (Array.isArray(value)) return value.map(snapshotValue);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          snapshotValue((value as Record<string, unknown>)[key]),
        ]),
    );
  return value;
}

test("the UI text matches the committed snapshot", async () => {
  const { readFile, writeFile } = await import("node:fs/promises");
  const actual = snapshotValue(text);
  if (process.env.UPDATE_TEXT_SNAPSHOT === "1")
    await writeFile(
      SNAPSHOT_URL,
      `${JSON.stringify(actual, null, 2)}
`,
    );
  const expected: unknown = JSON.parse(await readFile(SNAPSHOT_URL, "utf8"));
  assert.deepStrictEqual(actual, expected);
});

test("occupied uses the singular only for exactly one player", () => {
  const cases: [number, string][] = [
    [0, "LS: 0 powołanych"],
    [1, "LS: 1 powołany"],
    [2, "LS: 2 powołanych"],
    [5, "LS: 5 powołanych"],
    [22, "LS: 22 powołanych"],
  ];
  for (const [count, expected] of cases)
    assert.equal(text.occupied(count, "LS"), expected, `occupied(${count})`);
});
