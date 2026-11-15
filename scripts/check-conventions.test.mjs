import assert from "node:assert/strict";
import { test } from "node:test";
import { legacySizeProblems } from "./check-conventions.mjs";

const CSS = [
  ":root {",
  "  --gap: 4px;",
  "}",
  ".a {",
  "  margin: -1px 0.5rem;",
  "  width: calc(100% - var(--gap));",
  "  letter-spacing: 0.13em;",
  "}",
].join("\n");

test("counts literal sizes outside custom property definitions", () => {
  assert.deepEqual(legacySizeProblems(CSS, 3), []);
});

test("a new literal size fails and asks for a token", () => {
  assert.match(legacySizeProblems(CSS, 2)[0] ?? "", /grew from 2 to 3/);
});

test("a removed literal size asks to lower the recorded count", () => {
  assert.match(legacySizeProblems(CSS, 4)[0] ?? "", /lower .* to 3/);
});

test("counts every CSS length unit, not only the common ones", () => {
  const css = [
    ".b {",
    "  width: 50vmin;",
    "  height: 2LH;",
    "  border-width: 1pt 1Q 1mm 1in;",
    "  inline-size: 40cqi;",
    "  block-size: 90dvb;",
    "  line-height: 1.5;",
    "}",
  ].join("\n");
  assert.deepEqual(legacySizeProblems(css, 8), []);
});
