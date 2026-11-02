import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { FinalReport, GameState } from "../data/types.ts";
import type { GameAction } from "../logic/state.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { summarizeUndo, undoSentence } from "./undo-summary.ts";

const LIMIT = 23;
const [first, second, third] = players;

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reduceGameState, state);
}

// Summary of undoing the last action applied to `before`.
function undoAfter(state: GameState, action: GameAction) {
  const done = reduceGameState(state, action);
  assert.notEqual(done, state, "the action must change the state");
  return summarizeUndo(done, reduceGameState(done, { type: "undo" }));
}

const started = run(createInitialState(7), { type: "start" });
const withThree = run(
  started,
  { type: "togglePlayer", id: first!.id, limit: LIMIT },
  { type: "togglePlayer", id: second!.id, limit: LIMIT },
  { type: "togglePlayer", id: third!.id, limit: LIMIT },
);

test("undoing a single call-up names the player", () => {
  assert.deepEqual(
    undoAfter(started, { type: "togglePlayer", id: first!.id, limit: LIMIT }),
    { kind: "callUp", name: first!.name },
  );
});

test("undoing a pair call-up counts the players", () => {
  assert.deepEqual(
    undoAfter(started, {
      type: "selectBoth",
      ids: [first!.id, second!.id],
      limit: LIMIT,
    }),
    { kind: "callUps", count: 2 },
  );
});

test("undoing a random fill counts the added players", () => {
  const filled = run(started, {
    type: "autoFill",
    selected: new Set(players.slice(0, 18).map((p) => p.id)),
    seed: 3,
  });
  assert.deepEqual(summarizeUndo(filled, run(filled, { type: "undo" })), {
    kind: "callUps",
    count: 18,
  });
});

test("undoing releases restores the names or the count", () => {
  assert.deepEqual(
    undoAfter(withThree, { type: "togglePlayer", id: first!.id, limit: LIMIT }),
    { kind: "release", name: first!.name },
  );
  assert.deepEqual(
    undoAfter(withThree, {
      type: "removePlayers",
      ids: [first!.id, second!.id],
    }),
    { kind: "releases", count: 2 },
  );
});

test("undoing an event decision names the event", () => {
  assert.deepEqual(
    undoAfter(withThree, {
      type: "resolveEvent",
      id: "doctor",
      effects: { fit: 1 },
    }),
    { kind: "event", eventId: "doctor" },
  );
});

test("undoing a formation change reports the restored formation", () => {
  const before = createInitialState(7);
  const other = before.system === "433" ? "3421" : "433";
  assert.deepEqual(undoAfter(before, { type: "setSystem", value: other }), {
    kind: "system",
    system: before.system,
  });
});

test("undoing the start, the camp end and the finish", () => {
  assert.deepEqual(undoAfter(createInitialState(7), { type: "start" }), {
    kind: "start",
  });
  // The camp end also clears the selection: the stage change wins.
  assert.deepEqual(
    undoAfter(withThree, {
      type: "completeCamp",
      squad: [first!, second!, third!],
    }),
    { kind: "completeCamp" },
  );
  const report = { squadIds: [first!.id] } as unknown as FinalReport;
  assert.deepEqual(undoAfter(withThree, { type: "finish", report, seed: 1 }), {
    kind: "finish",
  });
});

test("an undo that changed nothing is other", () => {
  assert.deepEqual(summarizeUndo(started, started), { kind: "other" });
});

test("each summary has its sentence", () => {
  const cases: [Parameters<typeof undoSentence>[0], string][] = [
    [{ kind: "finish" }, "Cofnięto zatwierdzenie kadry turniejowej."],
    [{ kind: "completeCamp" }, "Cofnięto zakończenie zgrupowania."],
    [{ kind: "start" }, "Cofnięto rozpoczęcie odprawy."],
    [
      { kind: "event", eventId: "doctor" },
      "Cofnięto decyzję w zdarzeniu: Raport medyczny: przeciążenie.",
    ],
    [
      { kind: "system", system: "433" },
      "Cofnięto zmianę formacji. Formacja: 4–3–3.",
    ],
    [{ kind: "callUp", name: "Jan Nowak" }, "Cofnięto powołanie: Jan Nowak."],
    [{ kind: "callUps", count: 18 }, "Cofnięto powołanie 18 zawodników."],
    [{ kind: "release", name: "Jan Nowak" }, "Cofnięto odwołanie: Jan Nowak."],
    [{ kind: "releases", count: 2 }, "Cofnięto odwołanie 2 zawodników."],
    [{ kind: "other" }, "Cofnięto ostatnią decyzję."],
  ];
  for (const [summary, sentence] of cases)
    assert.equal(undoSentence(summary), sentence);
});
