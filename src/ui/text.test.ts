import test from "node:test";
import assert from "node:assert/strict";
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
