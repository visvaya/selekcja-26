// Points Git at the versioned hooks in .githooks/. Runs from `pnpm install` (prepare).
// Skips silently outside a Git work tree (for example a source-only snapshot or CI cache).
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

try {
  if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") process.exit(0);
} catch {
  process.exit(0);
}

if (process.env.CI) process.exit(0);

git(["config", "core.hooksPath", ".githooks"]);
