// Checks the deployed site against public/_headers and the indexing policy (the site is meant
// to be indexed): every header a _headers rule declares is served with that value, no response
// carries an X-Robots-Tag that blocks indexing, and robots.txt does not disallow `/` for all
// crawlers. Used after each deploy and by the scheduled site monitor.
// Usage: node scripts/check-live-headers.mjs <site-url>
import { readFileSync } from "node:fs";
import { parseHeadersFile } from "./static-headers.mjs";

const REQUEST_TIMEOUT_MS = 15_000;

/** @typedef {{ pattern: string, headers: Record<string, string> }} HeaderRule */

/**
 * @param {string} pattern
 * @param {string} path
 */
function matches(pattern, path) {
  return new URLPattern({ pathname: pattern }).test({ pathname: path });
}

/**
 * Headers for a path: Cloudflare applies every rule whose pattern matches it.
 * @param {HeaderRule[]} rules
 * @param {string} path
 * @returns {Record<string, string>}
 */
export function expectedHeaders(rules, path) {
  return Object.assign(
    {},
    ...rules
      .filter((rule) => matches(rule.pattern, path))
      .map((rule) => rule.headers),
  );
}

/**
 * The paths to request so that every rule is checked once: `/` and the root-relative
 * links of the start page, first match per pattern; patterns no path matches are reported.
 * @param {HeaderRule[]} rules
 * @param {string} html
 * @returns {{ paths: string[], unmatched: string[] }}
 */
export function pickProbePaths(rules, html) {
  const candidates = [
    "/",
    ...Array.from(
      html.matchAll(/(?:src|href)="(\/[^/"][^"]*)"/g),
      (match) => match[1] ?? "",
    ),
  ];
  const picked = rules.map((rule) => ({
    pattern: rule.pattern,
    path: candidates.find((path) => matches(rule.pattern, path)),
  }));
  return {
    paths: [
      ...new Set(
        picked.flatMap(({ path }) => (path === undefined ? [] : [path])),
      ),
    ],
    unmatched: picked
      .filter(({ path }) => path === undefined)
      .map(({ pattern }) => pattern),
  };
}

/**
 * @param {string} path
 * @param {Record<string, string>} expected
 * @param {Headers} served
 * @returns {string[]}
 */
export function headerProblems(path, expected, served) {
  const mismatches = Object.entries(expected).flatMap(([name, value]) => {
    const actual = served.get(name);
    return actual === value
      ? []
      : [
          `${path}: ${name} is ${actual === null ? "missing" : `"${actual}"`}, expected "${value}"`,
        ];
  });
  const robotsTag = served.get("X-Robots-Tag") ?? "";
  return /noindex|none/i.test(robotsTag)
    ? [...mismatches, `${path}: X-Robots-Tag "${robotsTag}" blocks indexing`]
    : mismatches;
}

/**
 * True when a group for all crawlers (`User-agent: *`) disallows the whole site.
 * @param {string} text robots.txt
 */
export function robotsDisallowsRoot(text) {
  const directives = text.split(/\r?\n/).flatMap((line) => {
    const content = line.split("#")[0]?.trim() ?? "";
    const separator = content.indexOf(":");
    return separator <= 0
      ? []
      : [
          {
            field: content.slice(0, separator).trim().toLowerCase(),
            value: content.slice(separator + 1).trim(),
          },
        ];
  });
  // A group is a run of User-agent lines followed by the rules that apply to those agents.
  const groups = directives.reduce(
    (
      /** @type {{ agents: string[], rules: { field: string, value: string }[] }[]} */ result,
      directive,
    ) => {
      const last = result.at(-1);
      if (directive.field === "user-agent") {
        return last !== undefined && last.rules.length === 0
          ? [
              ...result.slice(0, -1),
              { ...last, agents: [...last.agents, directive.value] },
            ]
          : [...result, { agents: [directive.value], rules: [] }];
      }
      if (last === undefined) return result;
      return [
        ...result.slice(0, -1),
        { ...last, rules: [...last.rules, directive] },
      ];
    },
    [],
  );
  return groups.some(
    (group) =>
      group.agents.includes("*") &&
      group.rules.some(
        ({ field, value }) =>
          field === "disallow" && (value === "/" || value === "/*"),
      ),
  );
}

/** @param {URL} url */
function get(url) {
  return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/**
 * @param {string} siteUrl
 * @returns {Promise<string[]>}
 */
async function checkSite(siteUrl) {
  const rules = parseHeadersFile(readFileSync("public/_headers", "utf8"));
  const home = await get(new URL("/", siteUrl));
  if (!home.ok) return [`/: HTTP ${home.status}`];
  const { paths, unmatched } = pickProbePaths(rules, await home.text());
  const pathProblems = await Promise.all(
    paths.map(async (path) => {
      const response = path === "/" ? home : await get(new URL(path, siteUrl));
      return response.ok
        ? headerProblems(path, expectedHeaders(rules, path), response.headers)
        : [`${path}: HTTP ${response.status}`];
    }),
  );
  const robots = await get(new URL("/robots.txt", siteUrl));
  const robotsProblems =
    robots.status === 404 || robots.status === 410
      ? []
      : !robots.ok
        ? [`/robots.txt: HTTP ${robots.status}`]
        : robotsDisallowsRoot(await robots.text())
          ? ["/robots.txt disallows / for all crawlers"]
          : [];
  return [
    ...unmatched.map(
      (pattern) => `${pattern}: no page links to a matching path to check`,
    ),
    ...pathProblems.flat(),
    ...robotsProblems,
  ];
}

if (import.meta.main) {
  const [siteUrl] = process.argv.slice(2);
  if (siteUrl === undefined) {
    process.stderr.write(
      "Usage: node scripts/check-live-headers.mjs <site-url>\n",
    );
    process.exit(2);
  }
  const problems = await checkSite(siteUrl);
  if (problems.length > 0) {
    process.stderr.write(`Live site check failed:\n${problems.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `${siteUrl}: headers match public/_headers and the site is indexable\n`,
  );
}
