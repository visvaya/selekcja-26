// WCAG 2.x contrast checks for the palette in src/ui/styles/tokens.css.
//
// Two sets of pairs are checked, and every pair must meet its required ratio:
//   - the palette fixture: the pairs the mockup was checked against, whose
//     ratios this script must also reproduce;
//   - INTERIM_PAIRS: combinations the re-pointed legacy.css rules produce
//     that the fixture does not contain.
// There are no known failures. legacy.css itself may declare no colour.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  compositeOver,
  contrastRatio,
  extractRootTokens,
  oklabToRgb,
  parseColorLiteral,
  relativeLuminance,
  resolveColor,
  rgbToOklab,
  tokenContrastRatio,
} from "./contrast.mjs";

const TEXT_RATIO = 4.5;
const LARGE_OR_UI_RATIO = 3;

test("contrast formula matches known WCAG reference values", () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  assert.equal(contrastRatio(black, white), 21);
  assert.equal(contrastRatio(white, black), 21);
  assert.equal(contrastRatio(white, white), 1);

  // WCAG example: #767676 on white is the well-known "just passes 4.5:1"
  // mid-grey used in the spec's own worked examples.
  const midGrey = parseColorLiteral("#767676");
  const ratio = contrastRatio(midGrey, white);
  assert.ok(
    Math.abs(ratio - 4.54) < 0.01,
    `expected #767676 on white to be about 4.54:1, got ${ratio}`,
  );
});

test("relativeLuminance matches black and white endpoints", () => {
  assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
});

test("parseColorLiteral supports hex and rgb/rgba formats", () => {
  assert.deepEqual(parseColorLiteral("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColorLiteral("#ffffff"), {
    r: 255,
    g: 255,
    b: 255,
    a: 1,
  });
  assert.deepEqual(parseColorLiteral("rgba(201, 25, 45, 0.3)"), {
    r: 201,
    g: 25,
    b: 45,
    a: 0.3,
  });
  assert.throws(() => parseColorLiteral("hsl(0, 0%, 0%)"));
});

test("resolveColor follows var() chains", () => {
  const chained = new Map([
    ["--a", "var(--b)"],
    ["--b", "#112233"],
  ]);
  assert.deepEqual(resolveColor("var(--a)", chained), {
    r: 0x11,
    g: 0x22,
    b: 0x33,
    a: 1,
  });
});

function assertRgbClose(actual, expected, tolerance = 1) {
  for (const channel of ["r", "g", "b"])
    assert.ok(
      Math.abs(actual[channel] - expected[channel]) <= tolerance,
      `${channel}: expected ${expected[channel]}, got ${actual[channel]}`,
    );
}

test("parseColorLiteral supports oklch", () => {
  assertRgbClose(parseColorLiteral("oklch(1 0 0)"), { r: 255, g: 255, b: 255 });
  assertRgbClose(parseColorLiteral("oklch(0 0 0)"), { r: 0, g: 0, b: 0 });
  // CSS Color 4 reference: sRGB red is oklch(0.62796 0.25768 29.234).
  assertRgbClose(parseColorLiteral("oklch(0.62796 0.25768 29.234)"), {
    r: 255,
    g: 0,
    b: 0,
  });
  assertRgbClose(parseColorLiteral("oklch(62.796% 0.25768 29.234)"), {
    r: 255,
    g: 0,
    b: 0,
  });
  assert.equal(parseColorLiteral("oklch(0.22 0.02 40 / 0.35)").a, 0.35);
  // Out of gamut clamps instead of throwing.
  const clamped = parseColorLiteral("oklch(0.9 0.4 150)");
  for (const channel of ["r", "g", "b"])
    assert.ok(clamped[channel] >= 0 && clamped[channel] <= 255);
});

test("parseColorLiteral accepts a percentage alpha in oklch", () => {
  assert.equal(parseColorLiteral("oklch(0.3 0.03 255 / 50%)").a, 0.5);
  assert.equal(parseColorLiteral("oklch(0.3 0.03 255 / 100%)").a, 1);
});

test("parseColorLiteral rejects an oklch hue with an unsupported unit", () => {
  assert.throws(() => parseColorLiteral("oklch(0.3 0.03 0.25turn)"));
  assert.throws(() => parseColorLiteral("oklch(0.3 0.03 1rad)"));
  // Bare numbers and deg stay accepted.
  assertRgbClose(
    parseColorLiteral("oklch(0.3 0.03 255deg)"),
    parseColorLiteral("oklch(0.3 0.03 255)"),
  );
});

test("parseColorLiteral rejects none in any oklch channel", () => {
  assert.throws(() => parseColorLiteral("oklch(none 0.03 255)"));
  assert.throws(() => parseColorLiteral("oklch(0.3 none 255)"));
  assert.throws(() => parseColorLiteral("oklch(0.3 0.03 none)"));
});

test("oklab conversion round-trips sRGB", () => {
  const colour = { r: 18, g: 52, b: 86, a: 1 };
  assertRgbClose(oklabToRgb(rgbToOklab(colour)), colour);
});

test("resolveColor mixes in oklab like the browser", () => {
  const mixTokens = new Map([
    ["--black", "#000"],
    ["--white", "#fff"],
    ["--mix", "color-mix(in oklab, var(--white) 50%, var(--black))"],
    ["--only-second", "color-mix(in oklab, var(--white), var(--black) 100%)"],
    ["--select", "oklch(0.3 0.03 255)"],
    ["--surface", "oklch(0.99 0.003 60)"],
    ["--wash", "color-mix(in oklab, var(--select) 9%, var(--surface))"],
  ]);
  // Oklab L = 0.5 grey is about sRGB 99.
  assertRgbClose(resolveColor("var(--mix)", mixTokens), {
    r: 99,
    g: 99,
    b: 99,
  });
  assertRgbClose(resolveColor("var(--only-second)", mixTokens), {
    r: 0,
    g: 0,
    b: 0,
  });
  const wash = resolveColor("var(--wash)", mixTokens);
  const surface = resolveColor("var(--surface)", mixTokens);
  // The wash mixes 9% of a blue-leaning navy into the near-white surface,
  // so every channel drops, but red and green should drop more than blue.
  assert.ok(
    surface.r - wash.r > surface.b - wash.b,
    "the navy wash should reduce the blue channel less than red, leaning blue",
  );
  assert.ok(
    surface.g - wash.g > surface.b - wash.b,
    "the navy wash should reduce the blue channel less than green, leaning blue",
  );
  assert.ok(wash.r < surface.r, "the wash is darker than the surface");
});

test("resolveColor mixes nested color-mix() arguments", () => {
  const nestedTokens = new Map([
    ["--black", "#000"],
    ["--white", "#fff"],
    ["--half", "color-mix(in oklab, var(--white) 50%, var(--black))"],
    ["--nested", "color-mix(in oklab, var(--half) 50%, var(--white))"],
  ]);
  const nested = resolveColor("var(--nested)", nestedTokens);
  const half = resolveColor("var(--half)", nestedTokens);
  assert.ok(
    nested.r > half.r,
    "mixing the half-grey with white should lighten it further",
  );
});

test("resolveColor rejects unsupported color-mix() spaces", () => {
  const spaceTokens = new Map([
    ["--black", "#000"],
    ["--white", "#fff"],
    ["--bad", "color-mix(in srgb, var(--white) 50%, var(--black))"],
  ]);
  assert.throws(
    () => resolveColor("var(--bad)", spaceTokens),
    /Unsupported color-mix\(\) space/,
  );
});

test("resolveColor rejects color-mix() with two percentages", () => {
  const twoPercentTokens = new Map([
    ["--black", "#000"],
    ["--white", "#fff"],
    ["--bad", "color-mix(in oklab, var(--white) 30%, var(--black) 30%)"],
  ]);
  assert.throws(
    () => resolveColor("var(--bad)", twoPercentTokens),
    /color-mix\(\) with two percentages is not supported/,
  );
});

test("resolveColor rejects mixing translucent colours", () => {
  const alphaTokens = new Map([
    ["--translucent", "rgba(0, 0, 0, 0.5)"],
    ["--white", "#fff"],
    ["--bad-mix", "color-mix(in oklab, var(--translucent) 50%, var(--white))"],
  ]);
  assert.throws(
    () => resolveColor("var(--bad-mix)", alphaTokens),
    /translucent/,
  );
});

test("compositeOver blends a translucent colour over an opaque one", () => {
  const result = compositeOver(
    { r: 255, g: 0, b: 0, a: 0.5 },
    { r: 0, g: 0, b: 0, a: 1 },
  );
  assert.deepEqual(result, { r: 127.5, g: 0, b: 0, a: 1 });
});

// The palette of the redesign: the 200 foreground/background pairs the mockup was checked
// against (scripts/fixtures/contrast/tactics-board-bialo-czerwona.json), computed here from
// src/ui/styles/tokens.css. Each pair must meet its required ratio, and the ratio computed
// by this script must agree with the fixture, so a conversion error cannot pass unnoticed.
const paletteTokens = extractRootTokens(
  readFileSync(
    fileURLToPath(new URL("../src/ui/styles/tokens.css", import.meta.url)),
    "utf8",
  ),
);
const PALETTE_PAIRS = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../scripts/fixtures/contrast/tactics-board-bialo-czerwona.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);

test("the palette fixture has 200 pairs", () => {
  assert.equal(PALETTE_PAIRS.length, 200);
});

// The fixture was computed by the mockup's own tooling; this script agrees within 0.5 %
// (2026-09-29). A 1 % tolerance still catches a wrong conversion, which moves ratios by
// several percent.
for (const pair of PALETTE_PAIRS) {
  test(`palette pair ${pair.fg} on ${pair.bg} meets ${pair.required}:1`, () => {
    const ratio = tokenContrastRatio(
      `--${pair.fg}`,
      `--${pair.bg}`,
      paletteTokens,
    );
    assert.ok(
      ratio >= pair.required,
      `${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < ${pair.required} (${pair.note})`,
    );
    assert.ok(
      Math.abs(ratio - pair.ratio) <= pair.ratio * 0.01,
      `${pair.fg} on ${pair.bg}: computed ${ratio.toFixed(2)}, fixture ${pair.ratio}`,
    );
  });
}

// Combinations the re-pointed legacy.css rules produce that PALETTE_PAIRS does not contain.
// They cover legacy.css until the screen stages delete its rules; stage 11 removes this list.
// The dock summary's warning row mixes two palette tokens, so it gets a local token here.
const interimTokens = new Map([
  ...paletteTokens,
  [
    "--interim-warn-overlay",
    "color-mix(in oklab, var(--warn-fill) 25%, var(--surface))",
  ],
]);
const INTERIM_PAIRS = [
  {
    fg: "frame",
    bg: "board",
    required: LARGE_OR_UI_RATIO,
    note: "control borders on the board background: .search, .chip, .sort in .toolbar; .choice and .action-button on the start screen",
  },
  {
    fg: "warn-ink",
    bg: "interim-warn-overlay",
    required: TEXT_RATIO,
    note: ".dock-summary div.need, div.over and their span: text and border on the warning row",
  },
  {
    fg: "board-line",
    bg: "surface-dialog",
    required: LARGE_OR_UI_RATIO,
    note: ".compare-card and .profile-metric borders inside dialogs",
  },
  // Dark --ink panels: .brief, .result-hero, .dock-breakdown, .score, .profile-score.
  {
    fg: "on-select",
    bg: "ink",
    required: TEXT_RATIO,
    note: "light text on --ink panels (.brief, .brief h2, .result-hero, .result-hero h1, .dock-breakdown b, .score, .profile-score)",
  },
  {
    fg: "on-ink-border",
    bg: "ink",
    required: LARGE_OR_UI_RATIO,
    note: ".brief-stat divider on the brief panel",
  },
  {
    fg: "board-line",
    bg: "ink",
    required: LARGE_OR_UI_RATIO,
    note: ".mini-pitch border inside .dock-breakdown",
  },
  {
    fg: "interim-warn-overlay",
    bg: "ink",
    required: LARGE_OR_UI_RATIO,
    note: "the dock summary warning row against .dock-breakdown: its light fill marks the row edge (its --warn-ink border is 1.45:1 on --ink and only decorates)",
  },
  {
    fg: "on-select",
    bg: "ink-tile",
    required: TEXT_RATIO,
    note: ".dock-summary div b on its tile",
  },
  {
    fg: "on-ink-lead",
    bg: "ink-tile",
    required: TEXT_RATIO,
    note: ".dock-summary span on its tile",
  },
  {
    fg: "on-ink-dim",
    bg: "ink-tile",
    required: TEXT_RATIO,
    note: ".dock-breakdown small on a .dock-summary tile",
  },
  {
    fg: "select",
    bg: "board-deep",
    required: LARGE_OR_UI_RATIO,
    note: ".count-ring progress arc against its track",
  },
];

for (const pair of INTERIM_PAIRS) {
  test(`interim pair ${pair.fg} on ${pair.bg} meets ${pair.required}:1`, () => {
    const ratio = tokenContrastRatio(
      `--${pair.fg}`,
      `--${pair.bg}`,
      interimTokens,
    );
    assert.ok(
      ratio >= pair.required,
      `${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < ${pair.required} (${pair.note})`,
    );
  });
}

test("legacy.css declares no colour and no mockup-named spacing token", () => {
  const legacyTokens = extractRootTokens(
    readFileSync(
      fileURLToPath(new URL("../src/ui/styles/legacy.css", import.meta.url)),
      "utf8",
    ),
  );
  for (const [name, value] of legacyTokens) {
    assert.doesNotMatch(
      name,
      /^--space-\d+$/,
      `${name} collides with tokens.css`,
    );
    assert.doesNotMatch(
      value,
      /color-mix\(/,
      `${name}: ${value} mixes colours; colours live in tokens.css`,
    );
    assert.throws(
      () => parseColorLiteral(value),
      undefined,
      `${name}: ${value} is a colour; colours live in tokens.css`,
    );
  }
});
