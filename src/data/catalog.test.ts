import test from "node:test";
import assert from "node:assert/strict";
import { detailedPositionMap, players } from "./catalog.ts";
import { UI_TEXT } from "../ui/text.ts";

test("the candidate list covers every detailed position", () => {
  assert.equal(players.length, 61);
  for (const position of Object.keys(UI_TEXT.positions)) {
    const candidates = players.filter((player) => {
      const positions: readonly string[] = detailedPositionMap[player.name] || [
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
