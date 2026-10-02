// Pure decisions behind the strip's trait row; measurement lives in use-fitted-traits.ts.

// lineCounts[k] is the number of lines the row wraps to after hiding k tags from the end.
// Returns the smallest k with one line. The first tag is never hidden, so k stops at
// lineCounts.length - 1 (at most tags - 1).
export function hiddenTraitCount(lineCounts: readonly number[]): number {
  const index = lineCounts.findIndex((lines) => lines <= 1);
  return index < 0 ? Math.max(0, lineCounts.length - 1) : index;
}

// Distinct line positions among tag tops, with a tolerance for sub-pixel baselines.
const TRAIT_LINE_TOLERANCE_PX = 2;

export function countLines(tops: readonly number[]): number {
  return tops.reduce<number[]>(
    (lines, top) =>
      lines.some((line) => Math.abs(line - top) <= TRAIT_LINE_TOLERANCE_PX)
        ? lines
        : [...lines, top],
    [],
  ).length;
}
