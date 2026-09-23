// Fails when a tracked or new text file contains an em dash (U+2014) or an emoji.
// Usage: node scripts/check-text.mjs [file ...]
// Without arguments it scans every file Git would commit (tracked and untracked, not ignored).
// Characters are written as escapes so this file passes its own check.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const FORBIDDEN = [
  {
    pattern: new RegExp(String.fromCodePoint(0x2014), "u"),
    name: "em dash (U+2014); use an en dash (U+2013) or a middle dot (U+00B7)",
  },
  {
    // Every pictographic character counts, except the text symbols (c), (R) and TM.
    pattern: new RegExp(
      `\\p{Emoji_Presentation}|(?![${[0xa9, 0xae, 0x2122].map((code) => String.fromCodePoint(code)).join("")}])\\p{Extended_Pictographic}`,
      "u",
    ),
    name: "emoji",
  },
];
const SKIPPED_FILES = new Set(["pnpm-lock.yaml"]);
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".zip",
]);

function listFiles(args) {
  if (args.length > 0) return args;
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean);
}

function findProblems(file) {
  const normalized = file.replaceAll("\\", "/");
  if (
    SKIPPED_FILES.has(normalized) ||
    BINARY_EXTENSIONS.has(extname(normalized).toLowerCase()) ||
    !existsSync(file)
  )
    return [];
  const lines = readFileSync(file, "utf8").split("\n");
  return lines.flatMap((line, index) =>
    FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(
      ({ name }) => `${normalized}:${index + 1}: ${name}`,
    ),
  );
}

const problems = listFiles(process.argv.slice(2)).flatMap(findProblems);
if (problems.length > 0) {
  process.stderr.write(`Forbidden characters found:\n${problems.join("\n")}\n`);
  process.exit(1);
}
