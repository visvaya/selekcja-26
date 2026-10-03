import test from "node:test";
import assert from "node:assert/strict";
import { players, systems } from "../data/catalog.ts";
import type {
  GameState,
  GroupPosition,
  Player,
  Stage,
  SystemId,
} from "../data/types.ts";
import { detailedPositions } from "../logic/selection.ts";
import { slotGroups } from "../logic/squad-board.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import {
  boardHeadline,
  boardReason,
  boardToggleDescription,
  boardToggleName,
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

const fitsSystem = (player: Player, system: SystemId): boolean => {
  const fits = systems.find((candidate) => candidate.id === system)!.fits;
  return detailedPositions(player).some((position) => fits.includes(position));
};

function pick(count: number, predicate: (player: Player) => boolean): Player[] {
  const found = players.filter(predicate).slice(0, count);
  assert.equal(found.length, count, `catalogue has ${count} matching players`);
  return found;
}

test("the toggle name joins the headline and the open state", () => {
  const empty = boardState("camp", []);
  assert.equal(
    boardToggleName(empty, false),
    "Zostały 23 miejsca: rozwiń tablicę",
  );
  assert.equal(
    boardToggleName(empty, true),
    "Zostały 23 miejsca: zwiń tablicę",
  );
  assert.equal(
    boardToggleName(boardState("camp", squadOf(2, 7, 7, 7)), false),
    `${text.stages.camp.completed}: rozwiń tablicę`,
  );
});

test("the toggle description lists missing groups, outsiders and excess", () => {
  assert.equal(
    boardToggleDescription(boardState("camp", squadOf(2, 3, 3, 1))),
    "brakuje 4 × OBR • brakuje 4 × POM • brakuje 2 × NAP",
  );
  const started = reduceGameState(
    reduceGameState(createInitialState(7), {
      type: "setSystem",
      value: "3421",
    }),
    { type: "start" },
  );
  const outsiders: GameState = {
    ...started,
    selected: new Set(
      [
        ...pick(2, (p) => p.pos === "BR"),
        ...pick(3, (p) => p.pos === "OBR" && fitsSystem(p, "3421")),
        ...pick(3, (p) => p.pos === "POM" && fitsSystem(p, "3421")),
        ...pick(
          1,
          (p) => p.pos === "ATA" && detailedPositions(p).includes("N"),
        ),
        ...pick(5, (p) => p.pos === "ATA" && !fitsSystem(p, "3421")),
      ].map((player) => player.id),
    ),
  };
  assert.ok(
    boardToggleDescription(outsiders).endsWith(" • w tym poza ustawieniem: 5"),
    boardToggleDescription(outsiders),
  );
  const excess = boardToggleDescription(
    boardState("final", squadOf(4, 6, 6, 5)),
  );
  assert.ok(excess.includes("w tym ponad limit: 1 bramkarz"), excess);
  assert.ok(!excess.includes("jest o"), excess);
  assert.equal(
    boardToggleDescription(boardState("camp", squadOf(2, 7, 7, 7))),
    "",
  );
});
