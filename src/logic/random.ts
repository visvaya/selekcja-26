export function nextRandom(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
}

export function randomInt(
  seed: number,
  maximum: number,
): { seed: number; value: number } {
  const next = nextRandom(seed);
  return { seed: next.seed, value: Math.floor(next.value * maximum) };
}
