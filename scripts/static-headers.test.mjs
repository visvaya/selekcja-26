import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { headersForPattern, parseHeadersFile } from "./static-headers.mjs";

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

test("returns an empty set for a pattern that is not listed", () => {
  assert.deepEqual(headersForPattern("/*\n  X-Test: 1", "/other"), {});
});

test("the committed file sends a CSP without inline scripts or styles", () => {
  const text = readFileSync(
    fileURLToPath(new URL("../public/_headers", import.meta.url)),
    "utf8",
  );
  const csp = headersForPattern(text, "/*")["Content-Security-Policy"] ?? "";

  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self';/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
});
