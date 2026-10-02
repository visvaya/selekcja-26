import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { GameState, GroupPosition, Player, Stage } from "../data/types.ts";
import { slotGroups } from "../logic/squad-board.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import {
  boardHeadline,
  boardReason,
  groupPlayersText,
  slotGroupLabelText,
} from "./board-summary.ts";
import { UI_TEXT as text } from "./text.ts";

function boardState(stage: Stage, squad: readonly Player[]): GameState {
  const started = reduceGameState(createInitialState(3), { type: "start" });
  return {
    ...started,
    stage,
    selected: new Set(squad.map((player) => player.id)),
  };
}

const ofGroup = (group: GroupPosition, count: number): Player[] => {
  const found = players.filter((player) => player.pos === group);
  assert.ok(found.length >= count, `catalogue has ${count} × ${group}`);
  return found.slice(0, count);
};

const squadOf = (br: number, obr: number, pom: number, ata: number) => [
  ...ofGroup("BR", br),
  ...ofGroup("OBR", obr),
  ...ofGroup("POM", pom),
  ...ofGroup("ATA", ata),
];

const tally = (counts: Partial<Record<GroupPosition, number>>) => ({
  BR: 0,
  OBR: 0,
  POM: 0,
  ATA: 0,
  ...counts,
});

test("group player counts use Polish number agreement", () => {
  const cases: [GroupPosition, number, string][] = [
    ["BR", 1, "1 bramkarz"],
    ["BR", 2, "2 bramkarzy"],
    ["BR", 5, "5 bramkarzy"],
    ["BR", 22, "22 bramkarzy"],
    ["OBR", 1, "1 obrońca"],
    ["OBR", 2, "2 obrońców"],
    ["OBR", 5, "5 obrońców"],
    ["OBR", 22, "22 obrońców"],
    ["POM", 1, "1 pomocnik"],
    ["POM", 2, "2 pomocników"],
    ["POM", 5, "5 pomocników"],
    ["POM", 22, "22 pomocników"],
    ["ATA", 1, "1 napastnik"],
    ["ATA", 2, "2 napastników"],
    ["ATA", 5, "5 napastników"],
    ["ATA", 22, "22 napastników"],
  ];
  for (const [group, count, expected] of cases)
    assert.equal(groupPlayersText(tally({ [group]: count })), expected);
  assert.equal(
    groupPlayersText(tally({ OBR: 2, ATA: 3 })),
    "3 napastników i 2 obrońców",
  );
});

test("the headline counts the remaining places with number agreement", () => {
  assert.equal(
    boardHeadline(boardState("camp", squadOf(2, 7, 7, 6))),
    "Zostało 1 miejsce",
  );
  assert.equal(
    boardHeadline(boardState("camp", squadOf(2, 7, 7, 5))),
    "Zostały 2 miejsca",
  );
  assert.equal(
    boardHeadline(boardState("camp", squadOf(2, 7, 0, 0))),
    "Zostało 14 miejsc",
  );
  const ready = boardState("camp", squadOf(2, 7, 7, 7));
  assert.equal(boardHeadline(ready), text.stages.camp.completed);
  assert.equal(boardReason(ready), "");
});

test("the reason explains a full but blocked squad", () => {
  assert.equal(
    boardReason(boardState("camp", squadOf(2, 7, 0, 0))),
    "Zostało 14 miejsc.",
  );
  const blocked = boardState("final", squadOf(4, 7, 8, 7));
  const reason =
    "W tym ponad limit: 1 bramkarz. Turniej wymaga dokładnie 3 bramkarzy. Brakuje 1 × OBR.";
  assert.equal(boardReason(blocked), reason);
  assert.equal(boardHeadline(blocked), reason);
  assert.equal(
    boardReason(boardState("final", squadOf(4, 6, 7, 9))),
    "W tym ponad limit: 2 napastników i 1 bramkarz. Turniej wymaga dokładnie 3 bramkarzy. Brakuje 2 × OBR • brakuje 1 × POM.",
  );
  assert.equal(
    boardReason(boardState("camp", squadOf(2, 6, 7, 8))),
    "W tym ponad limit: 1 napastnik. Brakuje 1 × OBR.",
  );
  assert.equal(
    boardReason(
      boardState(
        "camp",
        squadOf(2, 7, 7, 1).concat(ofGroup("ATA", 7).slice(1)),
      ),
    ),
    "",
  );
});

test("no player-facing output shows the internal ATA id", () => {
  for (const state of [
    boardState("camp", squadOf(2, 7, 7, 0).concat(ofGroup("POM", 14).slice(7))),
    boardState(
      "final",
      squadOf(3, 8, 8, 0).concat(ofGroup("OBR", 15).slice(8)),
    ),
  ]) {
    assert.ok(!boardReason(state).includes("ATA"), boardReason(state));
    assert.match(boardReason(state), /NAP/);
  }
});

test("slot group labels show the short code, quota and pool", () => {
  const state = boardState("camp", squadOf(2, 3, 0, 6));
  assert.deepEqual(slotGroups(state).map(slotGroupLabelText), [
    "BR 2/2",
    "OBR 3/7",
    "POM 0/7",
    "NAP 6 (min. 3)",
    "Dowolne 3/4",
  ]);
});
