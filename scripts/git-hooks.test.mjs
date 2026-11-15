import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const directory = mkdtempSync(join(tmpdir(), "git-hooks-"));
after(() => rmSync(directory, { recursive: true }));

/** @param {string[]} args @param {string} subject */
function run(args, subject) {
  const file = join(directory, "message.txt");
  writeFileSync(file, `${subject}\n`);
  const [hook, ...rest] = args;
  return spawnSync(
    process.execPath,
    ["scripts/git-hooks.mjs", hook ?? "", file, ...rest],
    { encoding: "utf8" },
  ).status;
}

const LONG = `build(deps): ${"bump the development group with updates ".repeat(2)}`;

test("a pull request title gets the commit subject rules without exemptions", () => {
  assert.equal(run(["pr-title", "visvaya"], "ci: harden the pipeline"), 0);
  assert.equal(run(["pr-title", "visvaya"], "Harden the pipeline"), 1);
  assert.equal(run(["pr-title", "visvaya"], LONG), 1);
  for (const subject of ['Revert "ci: x"', "Merge branch x", "fixup! ci: x"]) {
    assert.equal(run(["pr-title", "visvaya"], subject), 1);
    assert.equal(run(["commit-msg"], subject), 0);
  }
});

test("only a Dependabot title may exceed 72 characters", () => {
  assert.equal(run(["pr-title", "dependabot[bot]"], LONG), 0);
  assert.equal(run(["pr-title", "dependabot[bot]"], "Bump vite"), 1);
  assert.equal(run(["commit-msg"], LONG), 1);
});
