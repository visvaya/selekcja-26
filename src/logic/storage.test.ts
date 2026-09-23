import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, reduceGameState } from "./state.ts";
import { loadGame, saveGame } from "./storage.ts";

test("state round-trips through the asynchronous storage adapter", async () => {
  const values = new Map<string, string>();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
  try {
    const state = reduceGameState(createInitialState(8), {
      type: "togglePlayer",
      name: "A",
      limit: 23,
    });
    await saveGame(state);
    const restored = await loadGame();
    assert.ok(restored?.selected.has("A"));
    assert.equal(restored?.seed, 8);
    assert.equal(restored?.history.length, 1);
    assert.equal(reduceGameState(restored!, { type: "undo" }).selected.size, 0);
    const oldReport = {
      s: [],
      quality: 80,
      chem: 80,
      coverage: 100,
      luck: 0,
      points: 5,
      stage: "1/8 finału",
      grade: "B",
      strengths: [],
      weak: [],
      story: {
        matches: ["Faza grupowa: 5 pkt"],
        last: "Polska 0:1 Dania",
        outcome: "Polska odpadła w 1/8 finału.",
        seed: 9,
      },
    };
    values.set(
      "selekcja-26-game",
      JSON.stringify({
        schemaVersion: 1,
        state: {
          ...state,
          selected: ["A"],
          campSquad: [],
          events: [],
          report: oldReport,
        },
      }),
    );
    assert.deepEqual((await loadGame())?.report, oldReport);
    assert.deepEqual((await loadGame())?.history, []);
    values.set(
      "selekcja-26-game",
      JSON.stringify({ schemaVersion: 999, state: {} }),
    );
    assert.equal(await loadGame(), null);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
