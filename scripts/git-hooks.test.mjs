import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { excludedFiles, identityProblems } from "./git-hooks.mjs";

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

test("commit-msg rejects attribution lines, em dashes and emoji for everyone", () => {
  const dash = String.fromCodePoint(0x2014);
  const emoji = String.fromCodePoint(0x1f680);
  assert.equal(run(["commit-msg"], "fix: plain subject"), 0);
  // The diff that `git commit -v` appends below the scissors line is not checked.
  const scissors = "# ------------------------ >8 ------------------------";
  assert.equal(
    run(["commit-msg"], `fix: x\n${scissors}\n+text ${dash} ${emoji}`),
    0,
  );
  for (const message of [
    "fix: x\n\nCo-authored-by: Someone <someone@example.com>",
    "fix: x\n\nGenerated with Some Tool",
    "fix: x\n\nTool-Session: 1234",
    `fix: x ${dash} y`,
    `fix: x\n\nbody ${dash} line`,
    `fix: x ${emoji}`,
    // Subjects Git writes skip only the format and length rules.
    "fixup! fix: x\n\nCo-authored-by: Someone <someone@example.com>",
    `Merge branch x ${dash} y`,
    // `git commit -m` keeps lines that start with #.
    "fix: x\n\n# Generated with Some Tool",
    // Only a whole scissors line ends the message.
    `fix: x\n\nsee ${scissors}\nCo-authored-by: Someone <someone@example.com>`,
  ]) {
    assert.equal(run(["commit-msg"], message), 1, message);
  }
});

test("the identity check applies only with owner identities configured", () => {
  const owner = {
    role: "GIT_AUTHOR_IDENT",
    ident: "Owner <Owner@Example.com>",
  };
  const other = {
    role: "GIT_COMMITTER_IDENT",
    ident: "Other <other@example.com>",
  };
  assert.deepEqual(identityProblems([owner, other], []), []);
  assert.deepEqual(identityProblems([owner], ["owner@example.com"]), []);
  assert.equal(
    identityProblems([owner, other], ["owner@example.com"]).length,
    1,
  );
});

test("files that stay out of the repository cannot be staged", () => {
  assert.deepEqual(
    excludedFiles(["src/a.ts", "docs/notes.md", ".github/ci.yml"]),
    [],
  );
  const excluded = [
    "AGENTS.md",
    "CLAUDE.md",
    "sub/CLAUDE.local.md",
    ".agents/skills/x/SKILL.md",
    ".claude/settings.json",
    ".codex/hooks.json",
  ];
  assert.deepEqual(excludedFiles(["src/a.ts", ...excluded]), excluded);
});
