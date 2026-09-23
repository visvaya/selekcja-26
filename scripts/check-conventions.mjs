// Enforces the repository conventions from AGENTS.md that a linter cannot express:
// - file names in kebab-case (tool-mandated names excepted),
// - no classes in src/ except Error subclasses and a React error boundary,
// - CSS colors only as tokens inside :root blocks,
// - inline React styles only for data-driven CSS custom properties,
// - no absolute local paths in code (they leak the machine layout and break portability).
// Usage: node scripts/check-conventions.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const TOOL_MANDATED_NAMES = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "SKILL.md",
  "LICENSE",
]);
const KEBAB_CASE = /^\.?[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const CLASS_DECLARATION = /\bclass\s+[A-Za-z_$][\w$]*/;
const ALLOWED_CLASS =
  /\bclass\s+[\w$]+\s+extends\s+(?:[\w$]*Error|(?:React\.)?Component)\b/;
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/;
const INLINE_STYLE = /style=\{\{([^}]*)\}\}/g;
const ABSOLUTE_PATH = /["'`](?:[A-Za-z]:[\\/]|\/home\/|\/Users\/)/;
const CODE_FILE = /\.(?:[cm]?js|jsx|ts|tsx)$/;

function listFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter((file) => file && existsSync(file));
}

function fileNameProblems(file) {
  const name = basename(file);
  return TOOL_MANDATED_NAMES.has(name) || KEBAB_CASE.test(name)
    ? []
    : [`${file}: file name is not kebab-case`];
}

function classProblems(file, lines) {
  if (!/^src\/.*\.tsx?$/.test(file)) return [];
  const isErrorBoundary = lines.some((line) =>
    line.includes("componentDidCatch"),
  );
  return lines.flatMap((line, index) =>
    CLASS_DECLARATION.test(line) &&
    !(ALLOWED_CLASS.test(line) && (isErrorBoundary || /Error\b/.test(line)))
      ? [
          `${file}:${index + 1}: classes are allowed only for Error subclasses and an error boundary`,
        ]
      : [],
  );
}

function cssColorProblems(file, lines) {
  if (!/^src\/.*\.css$/.test(file)) return [];
  let depth = 0;
  let rootDepth = null;
  return lines.flatMap((line, index) => {
    if (rootDepth === null && /(^|[\s,]):root\b/.test(line)) rootDepth = depth;
    const problems =
      rootDepth === null && COLOR_LITERAL.test(line)
        ? [
            `${file}:${index + 1}: color literal outside :root; use a token from :root`,
          ]
        : [];
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (rootDepth !== null && depth <= rootDepth) rootDepth = null;
    return problems;
  });
}

function inlineStyleProblems(file, content) {
  if (!/^src\/.*\.tsx$/.test(file)) return [];
  return [...content.matchAll(INLINE_STYLE)].flatMap((match) => {
    const keys = [...match[1].matchAll(/(["']?)([\w-]+)\1\s*:/g)].map(
      (key) => key[2],
    );
    const line = content.slice(0, match.index).split("\n").length;
    return keys.every((key) => key.startsWith("--"))
      ? []
      : [
          `${file}:${line}: inline styles may only set CSS custom properties; move the rest to styles.css`,
        ];
  });
}

function absolutePathProblems(file, lines) {
  if (!CODE_FILE.test(file)) return [];
  return lines.flatMap((line, index) =>
    ABSOLUTE_PATH.test(line)
      ? [
          `${file}:${index + 1}: absolute local path; resolve it from the repository root instead`,
        ]
      : [],
  );
}

const problems = listFiles().flatMap((file) => {
  const normalized = file.replaceAll("\\", "/");
  const content = /\.(?:[cm]?js|jsx|tsx?|css)$/.test(normalized)
    ? readFileSync(file, "utf8")
    : "";
  const lines = content.split("\n");
  return [
    ...fileNameProblems(normalized),
    ...classProblems(normalized, lines),
    ...cssColorProblems(normalized, lines),
    ...inlineStyleProblems(normalized, content),
    ...absolutePathProblems(normalized, lines),
  ];
});

if (problems.length > 0) {
  process.stderr.write(`Convention violations:\n${problems.join("\n")}\n`);
  process.exit(1);
}
