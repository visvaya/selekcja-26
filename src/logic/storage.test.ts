import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, reduceGameState } from "./state.ts";
import { loadGame, saveGame } from "./storage.ts";

const KEY = "selekcja-26-game";

// Runs the body with a Map-backed localStorage installed on a fake window.
async function withStorage(
  body: (values: Map<string, string>) => Promise<void>,
): Promise<void> {
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
    await body(values);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

// Literal saves written by earlier versions of the game. They are inline JSON on purpose:
// building them from current types would hide a broken migration.
const V1_REPORT_SAVE = `{"schemaVersion":1,"state":{"system":"433","priority":"form","stage":"final","started":true,"selected":["Łukasz Skorupski","Robert Lewandowski"],"campSquad":["Łukasz Skorupski"],"trial":{"Łukasz Skorupski":{"delta":2,"note":"solid"}},"filter":"ALL","query":"","sort":"model","events":["doctor","captain","scout"],"effects":{"chem":5,"fit":4,"quality":-2},"compare":["Robert Lewandowski"],"seed":77,"report":{"s":[{"name":"Łukasz Skorupski","pos":"BR","club":"Bologna","ov":83,"form":80,"fit":91,"tact":79,"chem":82,"roles":["Refleks","Doświadczenie"],"age":35,"flags":""},{"name":"Robert Lewandowski","pos":"ATA","club":"FC Barcelona","ov":88,"form":82,"fit":76,"tact":91,"chem":94,"roles":["Napastnik","Lider","Powietrze"],"age":39,"flags":"Limit minut"}],"quality":80,"chem":80,"coverage":100,"luck":0,"points":5,"stage":"1/8 finału","grade":"B","strengths":[],"weak":[],"story":{"matches":["Faza grupowa: 5 pkt"],"last":"Polska 0:1 Dania","outcome":"Polska odpadła w 1/8 finału.","seed":9}}}}`;

const V2_FINAL_SAVE = `{"schemaVersion":2,"state":{"system":"3421","priority":"balance","stage":"final","started":true,"selected":["Jakub Kiwior","Paweł Wszołek"],"campSquad":["Jakub Kiwior","Kamil Grosicki"],"trial":{"Jakub Kiwior":{"delta":4,"note":"impressed"},"Kamil Grosicki":{"delta":-3,"note":"disappointed"}},"filter":"LŚO","query":"ki","sort":"form","events":["doctor","captain","scout"],"effects":{"chem":0,"fit":4,"quality":1},"compare":["Kamil Grosicki","Jakub Kiwior"],"seed":4242,"report":null,"history":[{"system":"3421","priority":"balance","stage":"camp","started":true,"selected":["Jakub Kiwior","Kamil Grosicki"],"campSquad":[],"trial":{},"filter":"ALL","query":"","sort":"model","events":["doctor"],"effects":{"chem":0,"fit":4,"quality":-1},"compare":[],"seed":4000,"report":null},{"system":"3421","priority":"balance","stage":"final","started":true,"selected":["Jakub Kiwior"],"campSquad":["Jakub Kiwior","Kamil Grosicki"],"trial":{"Jakub Kiwior":{"delta":4,"note":"impressed"},"Kamil Grosicki":{"delta":-3,"note":"disappointed"}},"filter":"ALL","query":"","sort":"model","events":["doctor","captain","scout"],"effects":{"chem":0,"fit":4,"quality":1},"compare":["Kamil Grosicki"],"seed":4242,"report":null}]}}`;

test("state round-trips through the asynchronous storage adapter", async () => {
  await withStorage(async (values) => {
    const state = reduceGameState(createInitialState(8), {
      type: "togglePlayer",
      id: "robert-lewandowski",
      limit: 23,
    });
    await saveGame(state);
    const saved = JSON.parse(values.get(KEY)!);
    assert.equal(saved.schemaVersion, 3);
    assert.deepEqual(saved.state.selected, ["robert-lewandowski"]);
    const restored = await loadGame();
    assert.ok(restored?.selected.has("robert-lewandowski"));
    assert.equal(restored?.seed, 8);
    assert.equal(restored?.history.length, 1);
    assert.equal(reduceGameState(restored!, { type: "undo" }).selected.size, 0);
  });
});

test("a version 1 save with a report migrates names to stable IDs", async () => {
  await withStorage(async (values) => {
    values.set(KEY, V1_REPORT_SAVE);
    const state = await loadGame();
    assert.ok(state);
    assert.deepEqual(
      [...state.selected],
      ["lukasz-skorupski", "robert-lewandowski"],
    );
    assert.deepEqual([...state.campSquad], ["lukasz-skorupski"]);
    assert.deepEqual(state.trial, {
      "lukasz-skorupski": { delta: 2, note: "solid" },
    });
    assert.deepEqual(state.compare, ["robert-lewandowski"]);
    assert.deepEqual(state.history, []);
    assert.deepEqual(state.report, {
      squadIds: ["lukasz-skorupski", "robert-lewandowski"],
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
    });
  });
});

test("a version 2 save keeps its undo history with stable IDs", async () => {
  await withStorage(async (values) => {
    values.set(KEY, V2_FINAL_SAVE);
    const state = await loadGame();
    assert.ok(state);
    assert.equal(state.stage, "final");
    assert.equal(state.filter, "LŚO");
    assert.equal(state.query, "ki");
    assert.deepEqual([...state.selected], ["jakub-kiwior", "pawel-wszolek"]);
    assert.deepEqual(state.compare, ["kamil-grosicki", "jakub-kiwior"]);
    assert.deepEqual(Object.keys(state.trial), [
      "jakub-kiwior",
      "kamil-grosicki",
    ]);
    assert.equal(state.history.length, 2);
    assert.deepEqual(
      [...state.history[0]!.selected],
      ["jakub-kiwior", "kamil-grosicki"],
    );
    assert.deepEqual(state.history[1]!.trial["kamil-grosicki"], {
      delta: -3,
      note: "disappointed",
    });
    const undone = reduceGameState(state, { type: "undo" });
    assert.deepEqual([...undone.selected], ["jakub-kiwior"]);

    await saveGame(state);
    const rewritten = JSON.parse(values.get(KEY)!);
    assert.equal(rewritten.schemaVersion, 3);
    assert.deepEqual(rewritten.state.campSquad, [
      "jakub-kiwior",
      "kamil-grosicki",
    ]);
    assert.deepEqual(rewritten.state.history[0].selected, [
      "jakub-kiwior",
      "kamil-grosicki",
    ]);
  });
});

test("unknown or malformed saves start a fresh game", async () => {
  await withStorage(async (values) => {
    const unknownName = V2_FINAL_SAVE.replace(
      '"selected":["Jakub Kiwior","Paweł Wszołek"]',
      '"selected":["Jakub Kiwior","Nobody Known"]',
    );
    const invalid = [
      JSON.stringify({ schemaVersion: 999, state: {} }),
      unknownName,
      V1_REPORT_SAVE.replace('"stage":"final"', '"stage":"semifinal"'),
      "{not json",
    ];
    for (const raw of invalid) {
      values.set(KEY, raw);
      assert.equal(await loadGame(), null, raw.slice(0, 80));
    }
    await saveGame(createInitialState(3));
    const valid = JSON.parse(values.get(KEY)!);
    const corrupted = [
      { ...valid.state, selected: ["no-such-player"] },
      { ...valid.state, trial: { "no-such-player": { delta: 1, note: "x" } } },
      { ...valid.state, compare: "robert-lewandowski" },
      { ...valid.state, system: "442" },
      { ...valid.state, effects: { chem: "1", fit: 0, quality: 0 } },
      { ...valid.state, history: [{ selected: [] }] },
      { ...valid.state, report: { squadIds: "x" } },
    ];
    for (const state of corrupted) {
      values.set(KEY, JSON.stringify({ ...valid, state }));
      assert.equal(await loadGame(), null, JSON.stringify(state).slice(0, 80));
    }
  });
});
