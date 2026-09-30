// The CI jobs run inside the official Playwright image, whose browsers must match the
// @playwright/test version the lockfile installs. A dependency update that bumps the package
// without the image (or the reverse) fails here instead of in the browser journeys.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const IMAGE =
  /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[0-9a-f]{64}/g;
const WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/visual-baselines.yml",
];

function lockedPlaywrightVersion() {
  const match = read("pnpm-lock.yaml").match(
    /^ {2}'@playwright\/test@(\d+\.\d+\.\d+)':$/m,
  );
  assert.ok(match, "pnpm-lock.yaml has no @playwright/test entry");
  return match[1];
}

for (const workflow of WORKFLOWS) {
  test(`${workflow} runs in the Playwright image of the locked version`, () => {
    const versions = [...read(workflow).matchAll(IMAGE)].map(
      (match) => match[1],
    );

    assert.ok(versions.length > 0, "no digest-pinned Playwright image");
    assert.deepEqual(
      versions,
      versions.map(() => lockedPlaywrightVersion()),
    );
  });
}
