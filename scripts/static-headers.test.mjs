import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { expectedHeaders, parseHeadersFile } from "./static-headers.mjs";

test("parses patterns with their indented headers and skips comments", () => {
  const text = [
    "# production headers",
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  Content-Security-Policy: default-src 'self'; img-src 'self' data:",
    "",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
  ].join("\r\n");

  assert.deepEqual(parseHeadersFile(text), [
    {
      pattern: "/*",
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; img-src 'self' data:",
      },
    },
    {
      pattern: "/assets/*",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  ]);
});

test("rejects a header line without a pattern or a name", () => {
  assert.throws(() => parseHeadersFile("  X-Test: 1"), /Invalid _headers line/);
  assert.throws(() => parseHeadersFile("/*\n  no separator"), /Invalid/);
});

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

test("the committed file sends a CSP without inline scripts or styles", () => {
  const text = readFileSync(
    fileURLToPath(new URL("../public/_headers", import.meta.url)),
    "utf8",
  );
  const csp =
    expectedHeaders(parseHeadersFile(text), "/")["Content-Security-Policy"] ??
    "";

  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("the committed file sends the security and cache headers", () => {
  const rules = parseHeadersFile(
    readFileSync(
      fileURLToPath(new URL("../public/_headers", import.meta.url)),
      "utf8",
    ),
  );
  const page = expectedHeaders(rules, "/");
  assert.equal(page["X-Content-Type-Options"], "nosniff");
  assert.equal(page["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    page["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=()",
  );
  assert.equal(page["Cache-Control"], undefined);
  assert.equal(
    expectedHeaders(rules, "/assets/index-a1.js")["Cache-Control"],
    "public, max-age=31536000, immutable",
  );
});
