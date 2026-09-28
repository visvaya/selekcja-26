// Pure colour and WCAG contrast helpers, reused by scripts/contrast.test.mjs.
// No DOM or CSS engine involved: colours are plain {r, g, b, a} objects with
// channels in 0-255 and alpha in 0-1.

const clamp255 = (value) => Math.min(255, Math.max(0, value));

function linearToSrgb(channel) {
  const c = Math.min(1, Math.max(0, channel));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function srgbToLinear(channel255) {
  const c = channel255 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert an Oklab colour to sRGB 0-255, clamped to the gamut (Ottosson's
 * matrices).
 * @param {{L: number, a: number, b: number, alpha?: number}} lab
 * @returns {{r: number, g: number, b: number, a: number}}
 */
export function oklabToRgb({ L, a, b, alpha = 1 }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: clamp255(linearToSrgb(r) * 255),
    g: clamp255(linearToSrgb(g) * 255),
    b: clamp255(linearToSrgb(bl) * 255),
    a: alpha,
  };
}

/**
 * Convert an sRGB 0-255 colour to Oklab.
 * @param {{r: number, g: number, b: number, a: number}} color
 * @returns {{L: number, a: number, b: number, alpha: number}}
 */
export function rgbToOklab({ r, g, b, a }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha: a,
  };
}

function parseOklch(body) {
  const [channels, alphaPart] = body.split("/");
  const [lightness, chroma, hue] = channels.trim().split(/\s+/);
  const L = lightness.endsWith("%")
    ? parseFloat(lightness) / 100
    : parseFloat(lightness);
  const C = parseFloat(chroma);
  const h = (parseFloat(hue) * Math.PI) / 180;
  const alpha = alphaPart === undefined ? 1 : parseFloat(alphaPart);
  return oklabToRgb({ L, a: C * Math.cos(h), b: C * Math.sin(h), alpha });
}

/**
 * Split a comma-separated argument list at top-level commas, ignoring
 * commas nested inside parentheses (e.g. a nested color-mix() or var()
 * fallback).
 * @param {string} body
 * @returns {string[]}
 */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(body.slice(start).trim());
  return parts;
}

/**
 * Split a single color-mix() argument into its colour and optional
 * percentage (e.g. "var(--white) 50%" or "var(--black)").
 * @param {string} argument
 * @returns {{color: string, percent: number|undefined}}
 */
function parseMixArgument(argument) {
  const match = /^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/.exec(argument.trim());
  return {
    color: match[1].trim(),
    percent: match[2] === undefined ? undefined : parseFloat(match[2]) / 100,
  };
}

/**
 * Resolve a `color-mix(in oklab, <color> [p%], <color> [q%])` body into a
 * concrete colour, matching the browser's Oklab mixing. Arguments may be
 * var() chains, literals or nested color-mix() calls.
 * @param {string} body
 * @param {Map<string, string>} tokens
 * @returns {{r: number, g: number, b: number, a: number}}
 */
function mixInOklab(body, tokens) {
  const [space, first, second] = splitTopLevel(body);
  if (space !== "in oklab") {
    throw new Error(`Unsupported color-mix() space: ${space}`);
  }
  const a = parseMixArgument(first);
  const b = parseMixArgument(second);
  const pa = a.percent ?? (b.percent === undefined ? 0.5 : 1 - b.percent);
  const labA = rgbToOklab(resolveColor(a.color, tokens));
  const labB = rgbToOklab(resolveColor(b.color, tokens));
  if (labA.alpha < 1 || labB.alpha < 1) {
    throw new Error("color-mix() of translucent colours is not supported");
  }
  return oklabToRgb({
    L: labA.L * pa + labB.L * (1 - pa),
    a: labA.a * pa + labB.a * (1 - pa),
    b: labA.b * pa + labB.b * (1 - pa),
    alpha: labA.alpha * pa + labB.alpha * (1 - pa),
  });
}

/**
 * Parse a single CSS colour literal (hex, rgb/rgba or oklch), with
 * color-mix(in oklab) resolved by resolveColor(). Does not resolve var()
 * references; callers resolve those first via resolveColor().
 * @param {string} value
 * @returns {{r: number, g: number, b: number, a: number}}
 */
export function parseColorLiteral(value) {
  const trimmed = value.trim();

  const hexMatch = /^#([0-9a-fA-F]{3,8})$/.exec(trimmed);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    throw new Error(`Unsupported hex colour format: ${value}`);
  }

  const rgbMatch = /^rgba?\(\s*([^)]+)\)$/.exec(trimmed);
  if (rgbMatch) {
    // Both comma-separated (rgb(1, 2, 3, 0.5)) and space-separated with an
    // optional slash before alpha (rgb(1 2 3 / 0.5)) are present in
    // shared skeleton conventions, so both are supported.
    const body = rgbMatch[1].replace("/", ",");
    const parts = body
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length < 3) {
      throw new Error(`Unsupported rgb() colour format: ${value}`);
    }
    const [r, g, b] = parts.slice(0, 3).map((part) => parseFloat(part));
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    return { r, g, b, a };
  }

  const oklchMatch = /^oklch\(\s*([^)]+)\)$/.exec(trimmed);
  if (oklchMatch) return parseOklch(oklchMatch[1]);

  throw new Error(`Unsupported colour format: ${value}`);
}

/**
 * Resolve a token value that may be a var() reference (possibly chained)
 * into a concrete colour, using the supplied token map.
 * @param {string} value
 * @param {Map<string, string>} tokens
 * @returns {{r: number, g: number, b: number, a: number}}
 */
export function resolveColor(value, tokens) {
  let current = value.trim();
  const seen = new Set();
  while (true) {
    const varMatch = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(current);
    const mixMatch = /^color-mix\(([\s\S]*)\)$/.exec(current);
    if (!varMatch && mixMatch) {
      return mixInOklab(mixMatch[1], tokens);
    }
    if (!varMatch) {
      return parseColorLiteral(current);
    }
    const [, name, fallback] = varMatch;
    if (seen.has(name)) {
      throw new Error(`Circular var() reference while resolving: ${name}`);
    }
    seen.add(name);
    const resolved = tokens.get(name);
    if (resolved === undefined) {
      if (fallback !== undefined) {
        current = fallback.trim();
        continue;
      }
      throw new Error(`Unknown custom property referenced: ${name}`);
    }
    current = resolved.trim();
  }
}

/**
 * Composite a (possibly transparent) colour over an opaque background.
 * @param {{r: number, g: number, b: number, a: number}} fg
 * @param {{r: number, g: number, b: number, a: number}} bg
 * @returns {{r: number, g: number, b: number, a: 1}}
 */
export function compositeOver(fg, bg) {
  if (fg.a >= 1) {
    return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  }
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function channelToLinear(channel255) {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * WCAG 2.x relative luminance of an opaque colour.
 * @param {{r: number, g: number, b: number}} color
 * @returns {number}
 */
export function relativeLuminance(color) {
  const r = channelToLinear(color.r);
  const g = channelToLinear(color.g);
  const b = channelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio between two opaque colours, in the range
 * [1, 21]. Order of arguments does not matter.
 * @param {{r: number, g: number, b: number}} colorA
 * @param {{r: number, g: number, b: number}} colorB
 * @returns {number}
 */
export function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract custom properties declared in every `:root { ... }` block of a
 * CSS source string. Later declarations of the same name override earlier
 * ones, matching CSS cascade order within the same specificity.
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function extractRootTokens(css) {
  const tokens = new Map();
  const rootBlockPattern = /:root\s*\{([\s\S]*?)\}/g;
  let blockMatch;
  while ((blockMatch = rootBlockPattern.exec(css)) !== null) {
    const body = blockMatch[1];
    const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let declarationMatch;
    while ((declarationMatch = declarationPattern.exec(body)) !== null) {
      const [, name, rawValue] = declarationMatch;
      tokens.set(name, rawValue.trim());
    }
  }
  return tokens;
}

/**
 * Resolve the contrast ratio between two design tokens, compositing the
 * foreground over the background first when it carries alpha.
 *
 * When the background token itself carries alpha (a panel colour laid over
 * a page section, such as `--on-dark-surface` over `--navy`), pass
 * `bgOntoToken` naming the opaque token underneath it; the background is
 * composited onto that colour before the foreground is composited onto the
 * result.
 * @param {string} fgToken
 * @param {string} bgToken
 * @param {Map<string, string>} tokens
 * @param {string} [bgOntoToken]
 * @returns {number}
 */
export function tokenContrastRatio(fgToken, bgToken, tokens, bgOntoToken) {
  const bgValue = tokens.get(bgToken);
  if (bgValue === undefined) {
    throw new Error(`Unknown background token: ${bgToken}`);
  }
  const fgValue = tokens.get(fgToken);
  if (fgValue === undefined) {
    throw new Error(`Unknown foreground token: ${fgToken}`);
  }
  const rawBg = resolveColor(bgValue, tokens);
  let bg = rawBg;
  if (rawBg.a < 1) {
    if (bgOntoToken === undefined) {
      throw new Error(
        `Background token ${bgToken} is not opaque; pass bgOntoToken naming the opaque colour underneath it`,
      );
    }
    const ontoValue = tokens.get(bgOntoToken);
    if (ontoValue === undefined) {
      throw new Error(`Unknown background-onto token: ${bgOntoToken}`);
    }
    const onto = resolveColor(ontoValue, tokens);
    if (onto.a < 1) {
      throw new Error(
        `Background-onto token ${bgOntoToken} must itself be opaque`,
      );
    }
    bg = compositeOver(rawBg, onto);
  }
  const rawFg = resolveColor(fgValue, tokens);
  const fg = compositeOver(rawFg, bg);
  return contrastRatio(fg, bg);
}
