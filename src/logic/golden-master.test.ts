// Golden master: every recorded scenario is replayed through the reducer and compared byte for
// byte with its checked-in trace. `pnpm golden:update` rewrites the traces; do that only for a
// deliberate change and explain every difference in the commit.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { UI_TEXT } from "../ui/text.ts";
import { SCENARIOS } from "./golden/scenarios.ts";
import { formatTrace, replayScenario } from "./replay.ts";

const TRACES_DIR = new URL("./golden/traces/", import.meta.url);
const updating = process.env.UPDATE_GOLDEN === "1";

const traceFile = (name: string) => new URL(`${name}.json`, TRACES_DIR);

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
