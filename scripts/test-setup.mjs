// Loaded before every unit test file (node --import). Game code must draw randomness from the
// seeded generator in src/logic/random.ts, so a Math.random call made directly from src/ fails
// the test. Calls from dependencies (Vite, jsdom) still work. oxlint bans the call site
// statically; this guard also catches indirect and UI-layer calls.
const originalRandom = Math.random;

Math.random = function guardedRandom() {
  const caller = new Error().stack?.split("\n")[2] ?? "";
  if (/[\\/]src[\\/]/.test(caller) && !caller.includes("node_modules"))
    throw new Error(
      `Math.random is forbidden in game code; use src/logic/random.ts. Caller: ${caller.trim()}`,
    );
  return originalRandom();
};
