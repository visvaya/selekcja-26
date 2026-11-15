import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// Runs the deploy's live header check against `vite preview`, which serves public/_headers the
// way the host does, so a header missing from the rules fails before a deploy, not after it.
test("the preview serves every header of public/_headers", ({ baseURL }) => {
  expect(baseURL).toBeDefined();
  const output = execFileSync(
    process.execPath,
    ["scripts/check-live-headers.mjs", baseURL ?? ""],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  expect(output).toContain("headers match public/_headers");
});
