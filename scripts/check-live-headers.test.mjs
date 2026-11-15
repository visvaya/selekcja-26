import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expectedHeaders,
  headerProblems,
  pickProbePaths,
  robotsDisallowsRoot,
} from "./check-live-headers.mjs";

const RULES = [
  { pattern: "/*", headers: { "X-Content-Type-Options": "nosniff" } },
  { pattern: "/assets/*", headers: { "Cache-Control": "immutable" } },
];

test("a path gets the headers of every rule that matches it", () => {
  assert.deepEqual(expectedHeaders(RULES, "/"), {
    "X-Content-Type-Options": "nosniff",
  });
  assert.deepEqual(expectedHeaders(RULES, "/assets/index-a1.js"), {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "immutable",
  });
});

test("a header set by two matching rules is expected with both values joined", () => {
  const rules = [
    { pattern: "/*", headers: { "Cache-Control": "public" } },
    { pattern: "/assets/*", headers: { "Cache-Control": "immutable" } },
  ];
  assert.deepEqual(expectedHeaders(rules, "/assets/a.js"), {
    "Cache-Control": "public, immutable",
  });
});

test("header names are joined regardless of their case", () => {
  const rules = [
    { pattern: "/*", headers: { "cache-control": "public" } },
    { pattern: "/assets/*", headers: { "Cache-Control": "immutable" } },
  ];
  assert.deepEqual(expectedHeaders(rules, "/assets/a.js"), {
    "cache-control": "public, immutable",
  });
});

test("probes the start page and one linked path per pattern", () => {
  const html =
    '<script src="/assets/index-a1.js"></script><link href="/assets/index-b2.css"><a href="//other.example/x">';
  assert.deepEqual(pickProbePaths(RULES, html), {
    paths: ["/", "/assets/index-a1.js"],
    unmatched: [],
  });
  assert.deepEqual(pickProbePaths(RULES, "<p>no links</p>"), {
    paths: ["/"],
    unmatched: ["/assets/*"],
  });
});

test("reports missing and different header values", () => {
  const served = new Headers({ "x-content-type-options": "nosniff" });
  assert.deepEqual(
    headerProblems("/", { "X-Content-Type-Options": "nosniff" }, served),
    [],
  );
  assert.deepEqual(
    headerProblems(
      "/a",
      { "X-Content-Type-Options": "other", "Cache-Control": "immutable" },
      served,
    ),
    [
      '/a: X-Content-Type-Options is "nosniff", expected "other"',
      '/a: Cache-Control is missing, expected "immutable"',
    ],
  );
});

test("an X-Robots-Tag that blocks indexing is a problem", () => {
  for (const value of ["noindex", "googlebot: noindex, nofollow", "none"]) {
    assert.deepEqual(
      headerProblems("/", {}, new Headers({ "X-Robots-Tag": value })),
      [`/: X-Robots-Tag "${value}" blocks indexing`],
    );
  }
  assert.deepEqual(
    headerProblems("/", {}, new Headers({ "X-Robots-Tag": "nosnippet" })),
    [],
  );
});

test("robots.txt blocks the site only when all crawlers are disallowed from /", () => {
  assert.equal(robotsDisallowsRoot("User-agent: *\nDisallow: /\n"), true);
  assert.equal(
    robotsDisallowsRoot("User-agent: Googlebot\nUser-agent: *\r\nDisallow: /*"),
    true,
  );
  assert.equal(
    robotsDisallowsRoot("# Disallow: /\nUser-agent: *\nDisallow:"),
    false,
  );
  assert.equal(
    robotsDisallowsRoot(
      "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private/",
    ),
    false,
  );
  assert.equal(
    robotsDisallowsRoot(
      "User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /",
    ),
    false,
  );
  assert.equal(robotsDisallowsRoot(""), false);
});

test("robots.txt lines may end in CR alone, and Sitemap does not split a group", () => {
  assert.equal(robotsDisallowsRoot("User-agent: *\rDisallow: /\r"), true);
  assert.equal(
    robotsDisallowsRoot(
      "User-agent: *\nSitemap: https://example.com/sitemap.xml\nUser-agent: ExampleBot\nDisallow: /",
    ),
    true,
  );
});

test("robots.txt rules follow RFC 9309 matching and precedence", () => {
  assert.equal(robotsDisallowsRoot("User-agent: *\nDisallow: /*$"), true);
  assert.equal(
    robotsDisallowsRoot("User-agent: *\nDisallow: /\nAllow: /"),
    false,
  );
  assert.equal(
    robotsDisallowsRoot("User-agent: *\nAllow: /\nDisallow: /*"),
    true,
  );
  assert.equal(
    robotsDisallowsRoot(
      "User-agent: *\nDisallow: /\n\nUser-agent: *\nAllow: /$",
    ),
    false,
  );
});
