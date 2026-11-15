// Size budget for the build in dist/, run after `pnpm build`. JS and CSS count as
// brotli-compressed bytes (the host serves them with br; node's default quality 11 is used, so
// the served bytes can be a little higher), fonts as file bytes (woff2 is already compressed).
// A budget is the size measured when it was set plus a small margin; raise one only with the
// reason in the commit. On failure the files of the exceeded kind are listed, largest first.
// Usage: node scripts/check-size.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { brotliCompressSync } from "node:zlib";

// Measured 2026-11-15 on the 0.1.8 build: js 93 150, css 13 757, fonts 117 476 bytes; the
// margin is about 2 % for js and css and 0.4 % for fonts, which change only with the packages.
const SIZE_BUDGET_BYTES = { js: 95_000, css: 14_100, fonts: 118_000 };
const DIST_DIR = "dist";

/** @typedef {{ js: number, css: number, fonts: number }} SizeTotals */
/** @typedef {keyof SizeTotals} SizeKind */

/**
 * @param {string} path
 * @returns {SizeKind | undefined}
 */
function kindOf(path) {
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".css")) return "css";
  if (/\.woff2?$/.test(path)) return "fonts";
  return undefined;
}

/**
 * @param {{ path: string, bytes: number }[]} files measured bytes per file
 * @param {SizeTotals} budget
 * @returns {{ totals: SizeTotals, problems: string[] }}
 */
export function checkSizes(files, budget) {
  /** @type {SizeKind[]} */
  const kinds = ["js", "css", "fonts"];
  const filesOf = (/** @type {SizeKind} */ kind) =>
    files.filter((file) => kindOf(file.path) === kind);
  const total = (/** @type {SizeKind} */ kind) =>
    filesOf(kind).reduce((sum, file) => sum + file.bytes, 0);
  const totals = { js: total("js"), css: total("css"), fonts: total("fonts") };
  const problems = kinds.flatMap((kind) =>
    totals[kind] <= budget[kind]
      ? []
      : [
          `${kind}: ${totals[kind]} bytes, budget ${budget[kind]} bytes`,
          ...filesOf(kind)
            .sort((a, b) => b.bytes - a.bytes)
            .map((file) => `  ${file.bytes} ${file.path}`),
        ],
  );
  return { totals, problems };
}

if (import.meta.main) {
  const files = readdirSync(DIST_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && kindOf(entry.name) !== undefined)
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      const content = readFileSync(path);
      return {
        path: relative(DIST_DIR, path).replaceAll("\\", "/"),
        bytes:
          kindOf(path) === "fonts"
            ? content.length
            : brotliCompressSync(content).length,
      };
    });
  const { totals, problems } = checkSizes(files, SIZE_BUDGET_BYTES);
  if (problems.length > 0) {
    process.stderr.write(`Size budget exceeded:\n${problems.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `dist/ within budget (bytes, js and css brotli): ${JSON.stringify(totals)}\n`,
  );
}
