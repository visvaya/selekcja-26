import test from "node:test";
import assert from "node:assert/strict";
import { traitOrder, type Trait } from "./trait-order.ts";

const role = (key: string, label: string): Trait => ({
  kind: "role",
  key,
  label,
});
const flag = (key: string, label: string): Trait => ({
  kind: "flag",
  key,
  label,
});

test("traitOrder puts the camp result first, then flags, then roles, each by Polish label", () => {
  const input: Trait[] = [
    role("winger", "Skrzydło"),
    flag("injury", "Uraz"),
    role("centre", "Środek"),
    { kind: "camp", key: "camp", label: "Wynik zgrupowania" },
    role("leader", "Lider"),
    flag("rhythm", "Brak rytmu"),
    role("link", "Łącznik"),
  ];
  assert.deepEqual(
    traitOrder(input).map((trait) => trait.label),
    [
      "Wynik zgrupowania",
      "Brak rytmu",
      "Uraz",
      "Lider",
      "Łącznik",
      "Skrzydło",
      "Środek",
    ],
  );
});

test("traitOrder returns a new array and keeps equal labels in input order", () => {
  const input: readonly Trait[] = Object.freeze([
    role("b", "Lider"),
    flag("x", "Uraz"),
    role("a", "Lider"),
  ]);
  const before = input.map((trait) => trait.key);
  const result = traitOrder(input);
  assert.equal(result === input, false);
  assert.deepEqual(
    input.map((trait) => trait.key),
    before,
  );
  assert.deepEqual(
    result.map((trait) => trait.key),
    ["x", "b", "a"],
  );
});
