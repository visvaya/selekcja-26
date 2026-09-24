// Ratchet test: WCAG 2.x contrast ratios computed from the `--` custom
// properties declared in `:root` in src/ui/styles.css.
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
  parseColorLiteral,
  relativeLuminance,
  resolveColor,
  tokenContrastRatio,
} from "./contrast.mjs";

const stylesPath = fileURLToPath(
  new URL("../src/ui/styles.css", import.meta.url),
);
const css = readFileSync(stylesPath, "utf8");
const tokens = extractRootTokens(css);

const TEXT_RATIO = 4.5;
const LARGE_OR_UI_RATIO = 3;

// Pairs are read off actual `color` + `background` declarations in
// styles.css (same rule or the closest ancestor that sets the
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

test("compositeOver blends a translucent colour over an opaque one", () => {
  const result = compositeOver(
    { r: 255, g: 0, b: 0, a: 0.5 },
    { r: 0, g: 0, b: 0, a: 1 },
  );
  assert.deepEqual(result, { r: 127.5, g: 0, b: 0, a: 1 });
});

test(":root tokens parse from styles.css", () => {
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
