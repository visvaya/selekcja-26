import test from "node:test";
import assert from "node:assert/strict";
import {
  detailedPositionMap,
  players,
  positionOrder,
  systems,
} from "./catalog.ts";
import { UI_TEXT } from "../ui/text.ts";
import type { DetailedPosition, GroupPosition } from "./types.ts";

const GROUP_BY_FIRST_POSITION: Record<DetailedPosition, GroupPosition> = {
  BR: "BR",
  LO: "OBR",
  LŚO: "OBR",
  ŚO: "OBR",
  PŚO: "OBR",
  PO: "OBR",
  LWO: "OBR",
  PWO: "OBR",
  DP: "POM",
  ŚP: "POM",
  OP: "POM",
  LS: "ATA",
  N: "ATA",
  PS: "ATA",
};

test("every player's group follows the first detailed position", () => {
  for (const player of players) {
    if (player.pos === "BR") continue;
    const first = detailedPositionMap[player.id]![0]!;
    assert.equal(player.pos, GROUP_BY_FIRST_POSITION[first], player.id);
  }
});

test("group sizes after the regrouping", () => {
  const count = (group: GroupPosition) =>
    players.filter((player) => player.pos === group).length;
  assert.deepEqual(
    {
      BR: count("BR"),
      OBR: count("OBR"),
      POM: count("POM"),
      ATA: count("ATA"),
    },
    { BR: 7, OBR: 22, POM: 17, ATA: 15 },
  );
});

test("the candidate list covers every detailed position", () => {
  assert.equal(players.length, 61);
  for (const position of Object.keys(UI_TEXT.positions)) {
    const candidates = players.filter((player) => {
      const positions: readonly string[] = detailedPositionMap[player.id] || [
        player.pos,
      ];
      return positions.includes(position);
    });
    assert.ok(
      candidates.length >= 5,
      `${position}: only ${candidates.length} candidates`,
    );
  }
});

test("players have unique stable IDs and every ID-keyed table uses them", () => {
  const ids = players.map((player) => player.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  for (const key of Object.keys(detailedPositionMap))
    assert.ok(ids.includes(key), `detailedPositionMap has unknown ID ${key}`);
});

test("role and availability IDs are English and all have Polish labels", () => {
  const roleIds = new Set([
    ...players.flatMap((player) => player.roles),
    ...systems.flatMap((system) => system.needs),
  ]);
  for (const role of roleIds) {
    assert.match(role, /^[a-z][A-Za-z]*$/);
    assert.ok(UI_TEXT.roles[role], `Missing label for role ${role}`);
  }
  for (const player of players)
    if (player.flag)
      assert.ok(UI_TEXT.availabilityFlags[player.flag], player.flag);
});

test("positions are ordered by line, deeper first, wingers before the striker", () => {
  const order = (Object.keys(positionOrder) as DetailedPosition[]).sort(
    (a, b) => positionOrder[a] - positionOrder[b],
  );
  assert.deepEqual(order, [
    "BR",
    "LO",
    "LŚO",
    "ŚO",
    "PŚO",
    "PO",
    "LWO",
    "PWO",
    "DP",
    "ŚP",
    "OP",
    "LS",
    "PS",
    "N",
  ]);
});
