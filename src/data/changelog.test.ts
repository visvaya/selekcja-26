import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHANGELOG, GAME_VERSION } from "./changelog.ts";
import { UI_TEXT } from "../ui/text.ts";

const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function semverParts(version: string): [number, number, number] {
  const [major, minor, patch] = version.split(".").map(Number);
  return [major!, minor!, patch!];
}

function compareSemver(left: string, right: string): number {
  const leftParts = semverParts(left),
    rightParts = semverParts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

function packageJsonPath(): string {
  return fileURLToPath(new URL("../../package.json", import.meta.url));
}

test("every entry has a valid semver version and ISO date", () => {
  for (const entry of CHANGELOG) {
    assert.match(entry.version, SEMVER, `bad semver: ${entry.version}`);
    assert.match(entry.date, ISO_DATE, `bad date: ${entry.date}`);
    assert.ok(
      !Number.isNaN(new Date(entry.date).getTime()),
      `not a valid date: ${entry.date}`,
    );
  }
});

test("entries are strictly descending by version and non-increasing by date", () => {
  for (let index = 1; index < CHANGELOG.length; index += 1) {
    const previous = CHANGELOG[index - 1]!,
      current = CHANGELOG[index]!;
    assert.ok(
      compareSemver(previous.version, current.version) > 0,
      `${previous.version} is not strictly greater than ${current.version}`,
    );
    assert.ok(
      previous.date >= current.date,
      `${previous.date} is not >= ${current.date}`,
    );
  }
});

test("every version is unique", () => {
  const versions = CHANGELOG.map((entry) => entry.version);
  assert.equal(new Set(versions).size, versions.length);
});

test("GAME_VERSION matches the first entry and package.json", () => {
  assert.equal(GAME_VERSION, CHANGELOG[0]!.version);
  const packageJson = JSON.parse(readFileSync(packageJsonPath(), "utf8")) as {
    version: string;
  };
  assert.equal(GAME_VERSION, packageJson.version);
});

test("every entry has at least one non-empty Polish note", () => {
  for (const entry of CHANGELOG) {
    const notes = UI_TEXT.changelogNotes[entry.version];
    assert.ok(notes && notes.length > 0, `no notes for ${entry.version}`);
    for (const note of notes)
      assert.ok(note.trim().length > 0, `empty note for ${entry.version}`);
  }
});
