import test from "node:test";
import assert from "node:assert/strict";
import { detailedPositionMap, players, systems } from "./catalog.ts";
import { UI_TEXT } from "../ui/text.ts";

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
