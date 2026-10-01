import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { RULES_REVISION } from "../data/constants.ts";
import { createInitialState, reduceGameState } from "./state.ts";
import { decodeSave, encodeSave } from "./save-format.ts";
import { migrateV3State } from "./save-migration.ts";
import { clearGame, loadGame, saveGame } from "./storage.ts";

const KEY = "selekcja-26-game";

interface WindowStub {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
}

// Runs the body with a Map-backed localStorage installed on a fake window. An optional
// `configure` callback can replace `localStorage` methods (e.g. to make `setItem` throw)
// before the body runs.
async function withStorage(
  body: (values: Map<string, string>) => Promise<void>,
  configure?: (stub: WindowStub, values: Map<string, string>) => void,
): Promise<void> {
  const values = new Map<string, string>();
  const stub: WindowStub = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  };
  configure?.(stub, values);
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: stub,
  });
  try {
    await body(values);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

// A real DOMException, matching what browsers throw from setItem when storage is full.
function quotaError(): DOMException {
  return new DOMException("quota exceeded", "QuotaExceededError");
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
    assert.equal(saved.schemaVersion, 4);
    assert.equal(saved.rulesRevision, RULES_REVISION);
    assert.deepEqual(saved.state.selected, ["robert-lewandowski"]);
    const restored = (await loadGame()).state;
    assert.ok(restored?.selected.has("robert-lewandowski"));
    assert.equal(restored?.seed, 8);
    assert.equal(restored?.history.length, 1);
    assert.equal(reduceGameState(restored!, { type: "undo" }).selected.size, 0);
  });
});

test("a version 1 save with a report migrates names to stable IDs", async () => {
  await withStorage(async (values) => {
    values.set(KEY, V1_REPORT_SAVE);
    const state = (await loadGame()).state;
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
      rulesRevision: 1,
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
    const state = (await loadGame()).state;
    assert.ok(state);
    assert.equal(state.stage, "final");
    assert.deepEqual(state.list.positions, ["LŚO"]);
    assert.equal(state.list.query, "ki");
    assert.equal(state.list.sort, "form");
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
    assert.equal(rewritten.schemaVersion, 4);
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

test("a tampered trial note is recomputed from delta, in state and history, on load", async () => {
  await withStorage(async (values) => {
    const started = reduceGameState(createInitialState(42), { type: "start" });
    const squad = [players[0]!];
    const afterCamp = reduceGameState(started, {
      type: "completeCamp",
      squad,
    });
    const playerId = squad[0]!.id;
    const trueNote = afterCamp.trial[playerId]!.note;
    const trueDelta = afterCamp.trial[playerId]!.delta;
    assert.notEqual(trueNote, "bogus-note");

    // Any remembered action after completeCamp pushes the current trial into history too.
    const withHistory = reduceGameState(afterCamp, {
      type: "setSystem",
      value: afterCamp.system === "4231" ? "3421" : "4231",
    });

    await saveGame(withHistory);
    const raw = JSON.parse(values.get(KEY)!);
    raw.state.trial[playerId].note = "bogus-note";
    raw.state.history.at(-1).trial[playerId].note = "another-bogus-note";
    values.set(KEY, JSON.stringify(raw));

    const loaded = (await loadGame()).state;
    assert.ok(loaded);
    assert.equal(loaded.trial[playerId]!.delta, trueDelta);
    assert.equal(loaded.trial[playerId]!.note, trueNote);
    assert.equal(loaded.history.at(-1)!.trial[playerId]!.delta, trueDelta);
    assert.equal(loaded.history.at(-1)!.trial[playerId]!.note, trueNote);
  });
});

test("a trial entry missing its note still loads, recomputed from delta", async () => {
  await withStorage(async (values) => {
    const started = reduceGameState(createInitialState(42), { type: "start" });
    const squad = [players[0]!];
    const afterCamp = reduceGameState(started, {
      type: "completeCamp",
      squad,
    });
    const playerId = squad[0]!.id;
    const trueNote = afterCamp.trial[playerId]!.note;

    await saveGame(afterCamp);
    const raw = JSON.parse(values.get(KEY)!);
    delete raw.state.trial[playerId].note;
    values.set(KEY, JSON.stringify(raw));

    const loaded = (await loadGame()).state;
    assert.ok(loaded);
    assert.equal(loaded.trial[playerId]!.note, trueNote);
  });
});

test("a trial entry with a non-string note still loads, recomputed from delta", async () => {
  await withStorage(async (values) => {
    const started = reduceGameState(createInitialState(42), { type: "start" });
    const squad = [players[0]!];
    const afterCamp = reduceGameState(started, {
      type: "completeCamp",
      squad,
    });
    const playerId = squad[0]!.id;
    const trueNote = afterCamp.trial[playerId]!.note;

    await saveGame(afterCamp);
    const raw = JSON.parse(values.get(KEY)!);
    raw.state.trial[playerId].note = 5;
    values.set(KEY, JSON.stringify(raw));

    const loaded = (await loadGame()).state;
    assert.ok(loaded);
    assert.equal(loaded.trial[playerId]!.note, trueNote);
  });
});

test("a legacy save with a trial note that contradicts its delta is recomputed", async () => {
  await withStorage(async (values) => {
    const tampered = V1_REPORT_SAVE.replace(
      '"trial":{"Łukasz Skorupski":{"delta":2,"note":"solid"}}',
      '"trial":{"Łukasz Skorupski":{"delta":2,"note":"przekonał"}}',
    );
    assert.notEqual(tampered, V1_REPORT_SAVE);
    values.set(KEY, tampered);
    const state = (await loadGame()).state;
    assert.ok(state);
    assert.deepEqual(state.trial, {
      "lukasz-skorupski": { delta: 2, note: "solid" },
    });
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
      assert.equal((await loadGame()).state, null, raw.slice(0, 80));
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
      assert.equal(
        (await loadGame()).state,
        null,
        JSON.stringify(state).slice(0, 80),
      );
    }
  });
});

async function savedWithRevision(
  values: Map<string, string>,
  rulesRevision: unknown,
  finished: boolean,
) {
  let state = reduceGameState(createInitialState(5), { type: "start" });
  if (finished)
    state = {
      ...state,
      stage: "final",
      report: {
        rulesRevision: RULES_REVISION + 1,
        squadIds: ["robert-lewandowski", "retired-player"],
        quality: 80,
        chem: 80,
        coverage: 100,
        luck: 0,
        points: 5,
        stage: "1/8 finału",
        grade: "B",
        strengths: [],
        weak: [],
        story: { matches: [], outcome: "", last: "", seed: 1 },
      },
    };
  await saveGame(state);
  const saved = JSON.parse(values.get(KEY)!);
  values.set(KEY, JSON.stringify({ ...saved, rulesRevision }));
  return state;
}

test("an unfinished game from other rules is discarded with a notice", async () => {
  await withStorage(async (values) => {
    await savedWithRevision(values, RULES_REVISION + 1, false);
    assert.deepEqual(await loadGame(), {
      state: null,
      discardedForRulesChange: true,
    });
  });
});

test("a finished report from other rules is kept without undo", async () => {
  await withStorage(async (values) => {
    const saved = await savedWithRevision(values, RULES_REVISION + 1, true);
    const loaded = await loadGame();
    assert.equal(loaded.discardedForRulesChange, false);
    assert.deepEqual(loaded.state?.report, saved.report);
    assert.deepEqual(loaded.state?.history, []);
    await saveGame(loaded.state!);
    const again = await loadGame();
    assert.equal(again.state?.report?.rulesRevision, RULES_REVISION + 1);
    assert.equal(JSON.parse(values.get(KEY)!).rulesRevision, RULES_REVISION);
  });
});

test("a version 3 save without a valid rules revision is rejected", async () => {
  await withStorage(async (values) => {
    for (const revision of [undefined, "1", 1.5, 0]) {
      await savedWithRevision(values, revision, false);
      assert.deepEqual(await loadGame(), {
        state: null,
        discardedForRulesChange: false,
      });
    }
  });
});

test("saveGame reports unavailable when neither backend can be used", async () => {
  await withStorage(
    async () => {
      const result = await saveGame(createInitialState(1));
      assert.deepEqual(result, { ok: false, reason: "unavailable" });
    },
    (stub) => {
      stub.localStorage.setItem = () => {
        throw new Error("no storage in this browser");
      };
    },
  );
});

test("a localStorage quota error is reported as quota", async () => {
  await withStorage(async (values) => {
    const result = await saveGame(createInitialState(2));
    assert.deepEqual(result, { ok: false, reason: "quota" });
    assert.equal(values.has(KEY), false);
  }, addFailingLocalWrite(quotaError()));
});

test("a generic localStorage error is reported as failed", async () => {
  await withStorage(
    async () => {
      const result = await saveGame(createInitialState(3));
      assert.deepEqual(result, { ok: false, reason: "failed" });
    },
    addFailingLocalWrite(new Error("disk error")),
  );
});

test("a later successful save after a failure recovers with the latest state", async () => {
  let shouldFail = true;
  await withStorage(
    async (values) => {
      const failing = await saveGame(createInitialState(4));
      assert.deepEqual(failing, { ok: false, reason: "quota" });

      shouldFail = false;
      const recovered = reduceGameState(createInitialState(4), {
        type: "togglePlayer",
        id: "robert-lewandowski",
        limit: 23,
      });
      const success = await saveGame(recovered);
      assert.deepEqual(success, { ok: true });
      const saved = JSON.parse(values.get(KEY)!);
      assert.deepEqual(saved.state.selected, ["robert-lewandowski"]);
    },
    addFailingLocalWrite(quotaError(), () => shouldFail),
  );
});

test("clearGame removes the key from the local backend", async () => {
  await withStorage(async (values) => {
    values.set(KEY, "local-copy");
    await clearGame();
    assert.equal(values.has(KEY), false);
  });
});

test("clearGame swallows a removal error", async () => {
  await withStorage(
    async () => {
      await assert.doesNotReject(clearGame());
    },
    (stub) => {
      // Only the real save key fails to remove; the availability probe's throwaway key still
      // works, so getLocalBackend succeeds and clearGame's own try/catch is exercised.
      stub.localStorage.removeItem = (key: string) => {
        if (key === KEY) throw new Error("remove blocked");
      };
    },
  );
});

test("two concurrent saves resolve in call order with their own results", async () => {
  await withStorage(async (values) => {
    const first = saveGame(createInitialState(9));
    const second = saveGame(createInitialState(10));
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.deepEqual(firstResult, { ok: true });
    assert.deepEqual(secondResult, { ok: true });
    const saved = JSON.parse(values.get(KEY)!);
    assert.equal(saved.state.seed, 10);
  });
});

test("a localStorage accessor that throws yields unavailable and does not poison later saves", async () => {
  await withStorage(async (values) => {
    let shouldThrow = true;
    const realStorage = (globalThis as { window: WindowStub }).window
      .localStorage;
    // A `window.localStorage` accessor that throws synchronously, as private-mode Safari or a
    // locked-down host might, before the availability probe can even run.
    Object.defineProperty(
      (globalThis as { window: WindowStub }).window,
      "localStorage",
      {
        configurable: true,
        get() {
          if (shouldThrow) throw new Error("localStorage accessor exploded");
          return realStorage;
        },
      },
    );

    const failing = await saveGame(createInitialState(11));
    assert.deepEqual(failing, { ok: false, reason: "unavailable" });

    shouldThrow = false;
    const recovered = await saveGame(createInitialState(12));
    assert.deepEqual(recovered, { ok: true });
    assert.equal(JSON.parse(values.get(KEY)!).state.seed, 12);
  });
});

test("a getItem that throws makes loadGame return a fresh game", async () => {
  await withStorage(
    async () => {
      const loaded = await loadGame();
      assert.deepEqual(loaded, { state: null, discardedForRulesChange: false });
    },
    (stub) => {
      stub.localStorage.getItem = () => {
        throw new Error("local read blocked");
      };
    },
  );
});

// Installs a localStorage whose setItem throws for the game key (but not the availability
// probe key) while `active` returns true, so tests can toggle failure on and off.
function addFailingLocalWrite(
  error: unknown,
  active: () => boolean = () => true,
) {
  return (stub: WindowStub, values: Map<string, string>) => {
    stub.localStorage.setItem = (key: string, value: string) => {
      if (key === KEY && active()) throw error;
      values.set(key, value);
    };
  };
}

const V3_STATE = `{"system":"3421","priority":"balance","stage":"final","started":true,"selected":["jakub-kiwior"],"campSquad":["jakub-kiwior","kamil-grosicki"],"trial":{"jakub-kiwior":{"delta":4,"note":"impressed"}},"filter":"LŚO","query":"ki","sort":"form","events":["doctor","captain","scout"],"effects":{"chem":0,"fit":4,"quality":1},"compare":[],"seed":4242,"report":null,"history":[{"system":"3421","priority":"balance","stage":"camp","started":true,"selected":[],"campSquad":[],"trial":{},"filter":"ALL","query":"","sort":"model","events":[],"effects":{"chem":0,"fit":0,"quality":0},"compare":[],"seed":4000,"report":null},{"system":"3421","priority":"balance","stage":"camp","started":true,"selected":["jakub-kiwior"],"campSquad":[],"trial":{},"filter":"OP","query":"x","sort":"name","events":[],"effects":{"chem":0,"fit":0,"quality":0},"compare":[],"seed":4001,"report":null}]}`;

test("a version 4 save round-trips every list field", () => {
  const state = reduceGameState(
    reduceGameState(createInitialState(8), { type: "start" }),
    {
      type: "setList",
      patch: {
        positions: ["LS", "ŚO"],
        query: "kam",
        sort: "form",
        foot: { left: true, right: false },
        traits: ["pace", "winger"],
        ranges: {
          age: { min: 20, max: null },
          campImpact: { min: null, max: 3 },
        },
        onlySelected: true,
        onlyCamp: true,
      },
    },
  );
  const decoded = decodeSave(encodeSave(state));
  assert.equal(decoded.discardedForRulesChange, false);
  assert.deepEqual(decoded.state?.list, state.list);
  const raw = JSON.parse(encodeSave(state));
  assert.equal(raw.schemaVersion, 4);
  assert.equal(raw.state.history.length, 1);
  assert.equal("list" in raw.state.history[0], false);
});

test("migrateV3State moves filter, query and sort into list", () => {
  const migrated = migrateV3State(JSON.parse(V3_STATE)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(migrated.list, {
    positions: ["LŚO"],
    query: "ki",
    sort: "form",
    foot: { left: false, right: false },
    traits: [],
    ranges: {},
    onlySelected: false,
    onlyCamp: false,
  });
  for (const key of ["filter", "query", "sort"])
    assert.equal(key in migrated, false, key);
  const history = migrated.history as Record<string, unknown>[];
  assert.equal(history.length, 2);
  for (const snapshot of history)
    for (const key of ["filter", "query", "sort", "list"])
      assert.equal(key in snapshot, false, key);
  assert.deepEqual(
    (
      migrateV3State({ ...JSON.parse(V3_STATE), filter: "ALL" }) as {
        list: { positions: string[] };
      }
    ).list.positions,
    [],
  );
});

test("migrateV3State passes malformed input through for validation", () => {
  assert.equal(migrateV3State("x"), null);
  const noHistory = migrateV3State({ filter: "ALL", history: "nope" }) as {
    history: unknown;
  };
  assert.equal(noHistory.history, "nope");
});

test("a version 4 save with an invalid list is rejected", () => {
  const valid = JSON.parse(
    encodeSave(reduceGameState(createInitialState(9), { type: "start" })),
  );
  const broken = [
    { positions: ["XX"] },
    { ranges: { age: { min: "30", max: null } } },
    { ranges: { height: { min: 1, max: null } } },
    { traits: ["flying"] },
    { onlySelected: "yes" },
  ];
  for (const patch of broken) {
    const raw = JSON.stringify({
      ...valid,
      state: { ...valid.state, list: { ...valid.state.list, ...patch } },
    });
    assert.deepEqual(
      decodeSave(raw),
      { state: null, discardedForRulesChange: false },
      JSON.stringify(patch),
    );
  }
});

test("migrateV3State drops the priority from the state and every snapshot", () => {
  const raw = JSON.parse(V3_STATE.replaceAll('"balance"', '"quality"'));
  const migrated = migrateV3State(raw) as Record<string, unknown>;
  assert.equal("priority" in migrated, false);
  for (const snapshot of migrated.history as Record<string, unknown>[])
    assert.equal("priority" in snapshot, false);
});
