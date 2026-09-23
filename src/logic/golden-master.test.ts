// Golden master: every recorded scenario is replayed through the reducer and compared byte for
// byte with its checked-in trace. `pnpm golden:update` rewrites the traces; do that only for a
// deliberate change and explain every difference in the commit.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { RULES_REVISION } from "../data/constants.ts";
import { UI_TEXT } from "../ui/text.ts";
import { SCENARIOS } from "./golden/scenarios.ts";
import { formatTrace, replayScenario } from "./replay.ts";

const TRACES_DIR = new URL("./golden/traces/", import.meta.url);
const updating = process.env.UPDATE_GOLDEN === "1";

const REVISIONS_FILE = new URL("./golden/rules-revisions.txt", import.meta.url);

const traceFile = (name: string) => new URL(`${name}.json`, TRACES_DIR);

// SHA-256 over every checked-in trace, in file name order.
function tracesHash(): string {
  const hash = createHash("sha256");
  for (const file of readdirSync(TRACES_DIR).sort())
    hash.update(`${file}\n`).update(readFileSync(new URL(file, TRACES_DIR)));
  return hash.digest("hex");
}

function firstDifference(actual: string, expected: string): string {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const line = actualLines.findIndex(
    (text, index) => text !== expectedLines[index],
  );
  return [
    `line ${line + 1}`,
    `expected: ${expectedLines[line] ?? "<end of file>"}`,
    `actual:   ${actualLines[line] ?? "<end of file>"}`,
  ].join("\n");
}

test(
  "scenario names are unique and every trace has a scenario",
  { skip: updating },
  () => {
    const names = SCENARIOS.map((scenario) => scenario.name);
    assert.equal(new Set(names).size, names.length);
    const files = readdirSync(TRACES_DIR).filter((file) =>
      file.endsWith(".json"),
    );
    assert.deepEqual(
      files.map((file) => file.replace(/\.json$/, "")).sort(),
      [...names].sort(),
    );
  },
);

for (const scenario of SCENARIOS) {
  test(`golden trace: ${scenario.name}`, () => {
    const actual = formatTrace(replayScenario(scenario, UI_TEXT));
    if (updating) {
      mkdirSync(TRACES_DIR, { recursive: true });
      writeFileSync(traceFile(scenario.name), actual);
      return;
    }
    const expected = readFileSync(traceFile(scenario.name), "utf8");
    if (actual !== expected)
      assert.fail(
        `Trace "${scenario.name}" differs from the checked-in file (a rule change needs a RULES_REVISION bump):\n${firstDifference(actual, expected)}`,
      );
  });
}

// rules-revisions.txt is append-only (the pre-commit hook rejects edits to existing lines): one
// "<revision> <traces sha256>" line per rules revision. Changed traces therefore need a new
// line, and the new line needs RULES_REVISION to move with it.
test(
  "the traces hash is recorded for the current rules revision",
  { skip: updating },
  () => {
    const entries = readFileSync(REVISIONS_FILE, "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [revision, hash] = line.split(" ");
        return { revision: Number(revision), hash };
      });
    entries.forEach((entry, index) =>
      assert.equal(entry.revision, index + 1, "revisions must count up from 1"),
    );
    assert.equal(
      new Set(entries.map((entry) => entry.hash)).size,
      entries.length,
      "each revision must record different traces",
    );
    const current = tracesHash();
    const latest = entries.at(-1);
    assert.ok(
      latest?.hash === current && latest.revision === RULES_REVISION,
      `Golden traces hash ${current} is not recorded for RULES_REVISION ${RULES_REVISION}. ` +
        `After a deliberate rule change: bump RULES_REVISION in src/data/constants.ts and append ` +
        `"<new RULES_REVISION> ${current}" to src/logic/golden/rules-revisions.txt. Explain every trace difference in the commit.`,
    );
  },
);
