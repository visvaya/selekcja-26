// Ratchet test: WCAG 2.x contrast ratios computed from the `--` custom
// properties declared in `:root` in src/ui/styles/legacy.css.
//
// This is a ratchet, not a gate that blocks every low-contrast pair: pairs
// already known to fail today are listed in KNOWN_FAILURES with the ratio
// measured when this test was written (rounded down to 2 decimals). The
// test fails if:
//   - a pair not listed in KNOWN_FAILURES does not meet its required ratio;
//   - a known failure's ratio drops below the recorded value (regression);
//   - a known failure's ratio now meets its required ratio (the map entry
//     is stale and must be removed).
// Known failures are left for the
// planned visual redesign (docs/future-scope.md).
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

const stylesPath = fileURLToPath(
  new URL("../src/ui/styles/legacy.css", import.meta.url),
);
const css = readFileSync(stylesPath, "utf8");
const tokens = extractRootTokens(css);

const TEXT_RATIO = 4.5;
const LARGE_OR_UI_RATIO = 3;

// Pairs are read off actual `color` + `background` declarations in
// legacy.css (same rule or the closest ancestor that sets the
// background), not chosen in the abstract. `bgOnto` names the opaque
// token a translucent background token is composited onto before the
// foreground is applied, matching how the two layers actually stack in
// the UI.
const PAIRS = [
  // Body and card text.
  {
    fg: "ink",
    bg: "paper",
    required: TEXT_RATIO,
    note: "body text on the page background",
  },
  {
    fg: "ink",
    bg: "card",
    required: TEXT_RATIO,
    note: "default text on card surfaces (choice, player, compare, modal, decision)",
  },
  {
    fg: "muted",
    bg: "paper",
    required: TEXT_RATIO,
    note: "muted text (.phase, .fineprint, .lead small print) on the page background",
  },
  {
    fg: "muted",
    bg: "card",
    required: TEXT_RATIO,
    note: "muted text (.meta, .kpi span, .dock-copy small, .squad-group h3) on card surfaces",
  },
  {
    fg: "text-secondary",
    bg: "card",
    required: TEXT_RATIO,
    note: ".chip and .sort text on card background",
  },
  {
    fg: "text-secondary",
    bg: "surface-soft",
    required: TEXT_RATIO,
    note: ".tag text on its soft surface background",
  },
  {
    fg: "lead-text",
    bg: "paper",
    required: TEXT_RATIO,
    note: ".lead paragraph on the start screen",
  },
  {
    fg: "dialog-text",
    bg: "card",
    required: TEXT_RATIO,
    note: ".modal p on the modal card background",
  },
  {
    fg: "position-text",
    bg: "surface-accent",
    required: TEXT_RATIO,
    note: ".pos position badge text",
  },
  {
    fg: "ink",
    bg: "squad-surface",
    required: TEXT_RATIO,
    note: ".squad-pill text on its pill background",
  },

  // Text on dark navy panels (brief card, result hero, dock breakdown, buttons).
  {
    fg: "card",
    bg: "navy",
    required: TEXT_RATIO,
    note: "light text on navy panels (.brief, .result-hero, .dock-breakdown, .finalize, .chip.active)",
  },
  {
    fg: "red-soft",
    bg: "navy",
    required: TEXT_RATIO,
    note: ".result-eyebrow text on the navy hero",
  },
  {
    fg: "brief-muted",
    bg: "navy",
    required: TEXT_RATIO,
    note: ".brief-stat span caption on the navy brief card",
  },
  {
    fg: "text-on-navy",
    bg: "navy",
    required: TEXT_RATIO,
    note: ".dock-breakdown small text on navy",
  },
  {
    fg: "success-soft",
    bg: "on-dark-surface",
    bgOnto: "navy",
    required: TEXT_RATIO,
    note: ".dock-summary span (default state) on its translucent panel over navy",
  },
  {
    fg: "warning-soft",
    bg: "warning-overlay",
    bgOnto: "navy",
    required: TEXT_RATIO,
    note: ".dock-summary .need/.over span on its translucent panel over navy",
  },
  {
    fg: "card",
    bg: "pitch-background",
    required: TEXT_RATIO,
    note: ".formation-label text on the pitch turf",
  },

  // Buttons and accent text.
  {
    fg: "card",
    bg: "red",
    required: TEXT_RATIO,
    note: ".primary button text on the red accent",
  },
  {
    fg: "card",
    bg: "red-dark",
    required: TEXT_RATIO,
    note: ".primary:hover button text on the darker red",
  },
  {
    fg: "red",
    bg: "paper",
    required: TEXT_RATIO,
    note: ".eyebrow text on the page background",
  },
  {
    fg: "green",
    bg: "card",
    required: TEXT_RATIO,
    note: ".better comparison highlight text",
  },

  // Warning and status surfaces.
  {
    fg: "warning-text",
    bg: "warning-surface",
    required: TEXT_RATIO,
    note: ".tag.alert and .save-status-alert text on the warning surface",
  },
  {
    fg: "warning-text",
    bg: "card",
    required: TEXT_RATIO,
    note: ".save-status-action retry button text on card",
  },
  {
    fg: "pitch-warning-text",
    bg: "pitch-warning-surface",
    required: TEXT_RATIO,
    note: ".formation-outsiders strong text",
  },
  {
    fg: "pitch-warning-muted",
    bg: "pitch-warning-surface",
    required: TEXT_RATIO,
    note: ".formation-outsiders small text",
  },
  {
    fg: "warning-panel-text",
    bg: "warning-panel",
    required: TEXT_RATIO,
    note: ".dock-warning text",
  },

  // Non-text UI: icons, borders and other elements that carry meaning on
  // their own (WCAG 1.4.11, 3:1).
  {
    fg: "pitch-warning-arrow",
    bg: "pitch-warning-surface",
    required: LARGE_OR_UI_RATIO,
    note: ".formation-outsiders .outside-arrow icon",
  },
  {
    fg: "red",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: "selected border colour (.choice.selected, .player.selected, .selected .radio) on card",
  },
  {
    fg: "navy",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: ".player.compare-on outline on card",
  },
  {
    fg: "green",
    bg: "surface-track",
    required: LARGE_OR_UI_RATIO,
    note: ".bar i / progress fill vs its track",
  },
  {
    fg: "red",
    bg: "surface-track",
    required: LARGE_OR_UI_RATIO,
    note: ".count-ring conic progress vs its track",
  },
  {
    fg: "pitch-marker",
    bg: "pitch-background",
    required: LARGE_OR_UI_RATIO,
    note: ".pitch-node border vs the pitch turf",
  },
  {
    fg: "line",
    bg: "paper",
    required: LARGE_OR_UI_RATIO,
    note: "form control border (.search) vs the page background",
  },
  {
    fg: "line",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: "form control and card border (.choice, .player, .kpi, .close) vs card background",
  },
  {
    fg: "radio-border",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: ".radio unselected border vs card",
  },
  {
    fg: "pitch-marker",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: ".pitch-node border vs its own card-coloured fill",
  },
  {
    fg: "focus-ring",
    bg: "paper",
    required: LARGE_OR_UI_RATIO,
    note: "focus-visible outline vs the page background",
  },
  {
    fg: "focus-ring",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: "focus-visible outline vs card-background controls",
  },
  {
    fg: "warning-border",
    bg: "warning-surface",
    required: LARGE_OR_UI_RATIO,
    note: "warning banner/tag border vs its own surface",
  },
  {
    fg: "warning-border",
    bg: "card",
    required: LARGE_OR_UI_RATIO,
    note: ".save-status-action border vs card",
  },
];

// Ratio measured when this test was written, rounded down to 2 decimals.
// May only move up (or the entry removed once the pair passes).
const KNOWN_FAILURES = new Map([
  ["line on paper", 1.19],
  ["line on card", 1.29],
  ["radio-border on card", 2.22],
  ["pitch-marker on card", 2.23],
  ["warning-border on warning-surface", 1.63],
  ["warning-border on card", 1.8],
]);

function pairKey(pair) {
  return `${pair.fg} on ${pair.bg}`;
}

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

test(":root tokens parse from legacy.css", () => {
  assert.equal(tokens.get("--ink"), "#11151c");
  assert.ok(tokens.size > 20, "expected a sizeable set of root tokens");
});

for (const pair of PAIRS) {
  test(`contrast: ${pairKey(pair)} (${pair.note})`, () => {
    const ratio = tokenContrastRatio(
      `--${pair.fg}`,
      `--${pair.bg}`,
      tokens,
      pair.bgOnto ? `--${pair.bgOnto}` : undefined,
    );
    const known = KNOWN_FAILURES.get(pairKey(pair));

    if (known === undefined) {
      assert.ok(
        ratio >= pair.required,
        `${pairKey(pair)} is ${ratio.toFixed(2)}:1, needs ${pair.required}:1 (${pair.note})`,
      );
      return;
    }

    assert.ok(
      ratio < pair.required,
      `${pairKey(pair)} now passes at ${ratio.toFixed(2)}:1; remove it from KNOWN_FAILURES`,
    );
    assert.ok(
      ratio >= known,
      `${pairKey(pair)} regressed to ${ratio.toFixed(2)}:1, was at least ${known}:1`,
    );
  });
}

test("KNOWN_FAILURES only lists pairs that are declared", () => {
  const declared = new Set(PAIRS.map(pairKey));
  for (const key of KNOWN_FAILURES.keys()) {
    assert.ok(declared.has(key), `KNOWN_FAILURES has a stale entry: ${key}`);
  }
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

test("every palette pair meets its required ratio and matches the fixture", () => {
  for (const pair of PALETTE_PAIRS) {
    const ratio = tokenContrastRatio(
      `--${pair.fg}`,
      `--${pair.bg}`,
      paletteTokens,
    );
    assert.ok(
      ratio >= pair.required,
      `${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < ${pair.required} (${pair.note})`,
    );
    // The fixture was computed by the mockup's own tooling; this script agrees within 0.5 %
    // (2026-09-29), all but ten pairs slightly above it. A 1 % tolerance still catches a
    // wrong conversion, which moves ratios by several percent.
    assert.ok(
      Math.abs(ratio - pair.ratio) <= pair.ratio * 0.01,
      `${pair.fg} on ${pair.bg}: computed ${ratio.toFixed(2)}, fixture ${pair.ratio}`,
    );
  }
});

// Combinations the re-pointed legacy.css rules produce that PALETTE_PAIRS does not contain.
// They cover legacy.css until the screen stages delete its rules; stage 11 removes this list.
// Only pairs of palette tokens are listed: text on legacy brand colours is re-pointed later.
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
