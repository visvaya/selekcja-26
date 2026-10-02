// Pure helpers of the range filter fields: parsing typed text, stepping, committing a pair of
// bounds against the scale and placing the track fill.
import type { RangeBounds } from "../data/types.ts";

export interface RangeScale {
  min: number;
  max: number;
}

// "" is an empty bound; text that is not a number (a lone "-") is "invalid". Both the ASCII
// hyphen and the typographic minus (U+2212) read as a minus sign.
export function parseRangeInput(raw: string): number | null | "invalid" {
  const text = raw.trim().replace("−", "-");
  if (text === "") return null;
  if (!/^-?\d+(?:[.,]\d+)?$/.test(text)) return "invalid";
  return Math.round(Number(text.replace(",", ".")));
}

export function clampToScale(value: number, scale: RangeScale): number {
  return Math.min(scale.max, Math.max(scale.min, value));
}

// An empty field starts at the scale minimum going up and at the maximum going down.
export function stepValue(
  current: number | null,
  direction: 1 | -1,
  scale: RangeScale,
): number {
  if (current === null) return direction > 0 ? scale.min : scale.max;
  return clampToScale(current + direction, scale);
}

// Clamps both bounds; when "od" passes "do", the side not edited follows the edited one.
export function normalizeRange(
  bounds: RangeBounds,
  edited: "min" | "max",
  scale: RangeScale,
): RangeBounds {
  const min = bounds.min === null ? null : clampToScale(bounds.min, scale);
  const max = bounds.max === null ? null : clampToScale(bounds.max, scale);
  if (min === null || max === null || min <= max) return { min, max };
  return edited === "min" ? { min, max: min } : { min: max, max };
}

// The stored form: a bound at its own scale end narrows nothing and is stored as null.
export function commitRange(
  bounds: RangeBounds,
  edited: "min" | "max",
  scale: RangeScale,
): RangeBounds {
  const normal = normalizeRange(bounds, edited, scale);
  return {
    min: normal.min === scale.min ? null : normal.min,
    max: normal.max === scale.max ? null : normal.max,
  };
}

// Track fill in percent of the scale, from clamped values (swapped if "od" passes "do").
export function fillPercent(
  bounds: RangeBounds,
  scale: RangeScale,
): { from: number; to: number } {
  const span = scale.max - scale.min;
  if (span <= 0) return { from: 0, to: 100 };
  const start = clampToScale(bounds.min ?? scale.min, scale);
  const end = clampToScale(bounds.max ?? scale.max, scale);
  const percent = (value: number) => ((value - scale.min) / span) * 100;
  return {
    from: percent(Math.min(start, end)),
    to: percent(Math.max(start, end)),
  };
}
