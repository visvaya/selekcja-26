import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { createInitialState } from "../logic/state.ts";
import { comparisonRows, splitTraits } from "./comparison-model.ts";
import type { Trait } from "./trait-order.ts";

const state = createInitialState(5);

test("comparison rows follow the design order, mark the winner and ties", () => {
  const left =
    players.find((player) => player.ov > players[0]!.ov) ?? players[0]!;
  const right = players.find((player) => player.ov < left.ov)!;
  const rows = comparisonRows(left, right, state);
  assert.deepEqual(
    rows.map((row) => row.id),
    [
      "selectionScore",
      "quality",
      "form",
      "fitness",
      "tactics",
      "experience",
      "chemistry",
      "groupImpact",
    ],
  );
  const quality = rows[1]!;
  assert.deepEqual(quality, {
    id: "quality",
    left: { value: left.ov, diff: left.ov - right.ov, better: true },
    right: { value: right.ov, diff: null, better: false },
    tie: false,
  });
  const reversed = comparisonRows(right, left, state)[1]!;
  assert.equal(reversed.right.better, true);
  assert.equal(reversed.right.diff, left.ov - right.ov);
  for (const row of comparisonRows(left, left, state)) {
    assert.equal(row.tie, true);
    assert.equal(row.left.better || row.right.better, false);
    assert.equal(row.left.diff ?? row.right.diff, null);
  }
});

const trait = (key: string, label: string): Trait => ({
  kind: "role",
  key,
  label,
});

test("shared traits come first in Polish order", () => {
  const left = [
    trait("set", "Stałe fragmenty"),
    trait("z", "Żelazny"),
    trait("cr", "Kreator"),
    trait("s", "Szybki"),
  ];
  const right = [
    trait("cr", "Kreator"),
    trait("a", "Ambitny"),
    trait("set", "Stałe fragmenty"),
    trait("sl", "Ślizg"),
  ];
  const split = splitTraits(left, right);
  assert.deepEqual(
    split.shared.map((t) => t.label),
    ["Kreator", "Stałe fragmenty"],
  );
  assert.deepEqual(
    split.leftOwn.map((t) => t.label),
    ["Szybki", "Żelazny"],
  );
  assert.deepEqual(
    split.rightOwn.map((t) => t.label),
    ["Ambitny", "Ślizg"],
  );
  assert.equal(
    splitTraits([trait("x", "A")], [{ kind: "flag", key: "x", label: "A" }])
      .shared.length,
    0,
  );
});
