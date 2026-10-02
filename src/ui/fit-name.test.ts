import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { chooseNameForm, fitsWidth, shortName, splitName } from "./fit-name.ts";

const full = "Piotr Zieliński";
const short = "P. Zieliński";

test("a fitting full name stays full", () => {
  assert.equal(chooseNameForm({ full, short, fits: () => true }), "full");
});

test("only the short form fits: short", () => {
  assert.equal(
    chooseNameForm({ full, short, fits: (text) => text === short }),
    "short",
  );
});

test("nothing fits: short, and CSS ellipsises it", () => {
  assert.equal(chooseNameForm({ full, short, fits: () => false }), "short");
});

test("short name keeps the initial and the surname", () => {
  assert.equal(shortName("Piotr", "Zieliński"), "P. Zieliński");
  assert.equal(shortName("", "Zieliński"), "Zieliński");
});

test("a name split on the first space keeps every later word in the surname", () => {
  const { first, last } = splitName("Jan Maria Kowalski");
  assert.equal(shortName(first, last), "J. Maria Kowalski");
});

test("every catalogue name splits into a given name and a surname", () => {
  for (const player of players) {
    const { first, last } = splitName(player.name);
    assert.equal(`${first} ${last}`, player.name);
  }
});

test("fits allows 0.01 px on the fits side only", () => {
  assert.equal(fitsWidth(100.005, 100), true);
  assert.equal(fitsWidth(100.02, 100), false);
});
