// The CI jobs run inside the official Playwright image named in .github/playwright/Dockerfile,
// whose browsers must match the @playwright/test version the lockfile installs. Dependabot
// updates both in one pull request; this test catches a bump that moves only one of them, and a
// workflow that names an image of its own instead of reading the Dockerfile.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const IMAGE_LINE =
  /^FROM mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[0-9a-f]{64}$/m;
const BROWSER_WORKFLOWS = [
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

test("the Playwright image matches the locked @playwright/test version", () => {
  const match = read(".github/playwright/Dockerfile").match(IMAGE_LINE);

  assert.ok(match, "no digest-pinned Playwright image in the Dockerfile");
  assert.equal(match[1], lockedPlaywrightVersion());
});

for (const workflow of BROWSER_WORKFLOWS) {
  test(`${workflow} takes the image from the Dockerfile`, () => {
    const text = read(workflow);

    assert.match(
      text,
      /image: \$\{\{ needs\.playwright-image\.outputs\.image \}\}/,
    );
    assert.doesNotMatch(text, /mcr\.microsoft\.com\/playwright/);
  });
}
