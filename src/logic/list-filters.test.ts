import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type {
  GameState,
  ListFilters,
  Player,
  RangeId,
  SortId,
} from "../data/types.ts";
import {
  appliedCriteriaCount,
  clearDetailFilters,
  DEFAULT_LIST_FILTERS,
  matchesListFilters,
  rangeValue,
  visiblePlayers,
} from "./list-filters.ts";
import { experienceScore, groupScore, modelScore } from "./scoring.ts";
import { detailedPositions, preferredFoot } from "./selection.ts";
import { createInitialState } from "./state.ts";

const withList = (
  patch: Partial<ListFilters>,
  state: GameState = createInitialState(1),
): GameState => ({ ...state, list: { ...DEFAULT_LIST_FILTERS, ...patch } });

const ids = (state: GameState): string[] =>
  players
    .filter((player) => matchesListFilters(player, state))
    .map((player) => player.id);

const idsWhere = (predicate: (player: Player) => boolean): string[] =>
  players.filter(predicate).map((player) => player.id);

const finalStage = (trialIds: string[]): GameState => ({
  ...createInitialState(1),
  stage: "final",
  trial: Object.fromEntries(
    trialIds.map((id) => [id, { delta: 2, note: "solid" as const }]),
  ),
  campSquad: new Set(trialIds),
});

test("default filters match every player", () => {
  assert.equal(ids(withList({})).length, players.length);
});

test("several positions match a player having any of them", () => {
  const kept = ids(withList({ positions: ["LS", "ŚO"] }));
  assert.deepEqual(
    kept,
    idsWhere((player) =>
      detailedPositions(player).some((pos) => pos === "LS" || pos === "ŚO"),
    ),
  );
  assert.ok(kept.length > 0);
  assert.ok(players.some((p) => p.pos === "BR"));
  assert.ok(!kept.some((id) => players.find((p) => p.id === id)!.pos === "BR"));
});

test("foot left only keeps left-footed players", () => {
  assert.deepEqual(
    ids(withList({ foot: { left: true, right: false } })),
    idsWhere((player) => preferredFoot(player) === "left"),
  );
});

test("foot right only keeps right-footed players", () => {
  assert.deepEqual(
    ids(withList({ foot: { left: false, right: true } })),
    idsWhere((player) => preferredFoot(player) === "right"),
  );
});

test("both feet keep two-footed players", () => {
  assert.deepEqual(
    ids(withList({ foot: { left: true, right: true } })),
    idsWhere((player) => preferredFoot(player) === "both"),
  );
});

test("no foot set keeps everyone", () => {
  assert.equal(
    ids(withList({ foot: { left: false, right: false } })).length,
    players.length,
  );
});

test("two traits keep only players having both", () => {
  const kept = ids(withList({ traits: ["pace", "winger"] }));
  assert.deepEqual(
    kept,
    idsWhere(
      (player) =>
        player.roles.includes("pace") && player.roles.includes("winger"),
    ),
  );
  assert.ok(
    kept.length < idsWhere((player) => player.roles.includes("pace")).length,
  );
});

test("an age range with an open end keeps age >= 30", () => {
  assert.deepEqual(
    ids(withList({ ranges: { age: { min: 30, max: null } } })),
    idsWhere((player) => player.age >= 30),
  );
});

test("an inclusive closed age range keeps exactly 30", () => {
  const kept = ids(withList({ ranges: { age: { min: 30, max: 30 } } }));
  assert.deepEqual(
    kept,
    idsWhere((player) => player.age === 30),
  );
  assert.ok(kept.length > 0);
});

test("campImpact is ignored at camp and drops players without trial at final", () => {
  const bound = { ranges: { campImpact: { min: -100, max: null } } };
  assert.equal(ids(withList(bound)).length, players.length);
  const trialIds = ["robert-lewandowski", "jakub-kiwior"];
  assert.deepEqual(ids(withList(bound, finalStage(trialIds))), [
    ...idsWhere((player) => trialIds.includes(player.id)),
  ]);
});

test("onlySelected keeps selected players", () => {
  const state = {
    ...createInitialState(1),
    selected: new Set(["robert-lewandowski"]),
  };
  assert.deepEqual(ids(withList({ onlySelected: true }, state)), [
    "robert-lewandowski",
  ]);
});

test("onlyCamp is ignored at camp and keeps camp players at final", () => {
  assert.equal(ids(withList({ onlyCamp: true })).length, players.length);
  assert.deepEqual(
    ids(withList({ onlyCamp: true }, finalStage(["jakub-kiwior"]))),
    ["jakub-kiwior"],
  );
});

test("rangeValue reads player stats and campImpact only with a trial", () => {
  const player = players.find((p) => p.id === "jakub-kiwior")!;
  const camp = createInitialState(1);
  assert.equal(rangeValue("age", player, camp), player.age);
  assert.equal(rangeValue("quality", player, camp), player.ov);
  assert.equal(rangeValue("fitness", player, camp), player.fit);
  assert.equal(rangeValue("chemistry", player, camp), player.chem);
  assert.equal(rangeValue("campImpact", player, camp), null);
  assert.equal(
    typeof rangeValue("campImpact", player, finalStage(["jakub-kiwior"])),
    "number",
  );
});

test("rangeValue maps every range id to its player value", () => {
  const state = createInitialState(1);
  const expected: Record<
    Exclude<RangeId, "campImpact">,
    (p: Player) => number
  > = {
    age: (p) => p.age,
    score: (p) => modelScore(p, state),
    quality: (p) => p.ov,
    form: (p) => p.form,
    fitness: (p) => p.fit,
    tactics: (p) => p.tact,
    experience: (p) => experienceScore(p),
    chemistry: (p) => p.chem,
    groupImpact: (p) => groupScore(p),
  };
  for (const player of players.slice(0, 5))
    for (const [id, value] of Object.entries(expected))
      assert.equal(rangeValue(id as RangeId, player, state), value(player), id);
});

test("a range bound on a stat filters by that stat", () => {
  assert.deepEqual(
    ids(withList({ ranges: { form: { min: null, max: 70 } } })),
    idsWhere((player) => player.form <= 70),
  );
});

test("visiblePlayers orders by every sort without dropping players", () => {
  const sorts: SortId[] = [
    "model",
    "quality",
    "form",
    "fitness",
    "tactics",
    "experience",
    "group",
    "young",
    "old",
    "name",
  ];
  for (const sort of sorts) {
    const listed = visiblePlayers(withList({ sort }));
    assert.equal(listed.length, players.length, sort);
  }
  const young = visiblePlayers(withList({ sort: "young" }));
  assert.ok(young[0]!.age <= young.at(-1)!.age);
  const byQuality = visiblePlayers(withList({ sort: "quality" }));
  assert.ok(byQuality[0]!.ov >= byQuality.at(-1)!.ov);
  const query = visiblePlayers(withList({ query: "  LEWANDOWSKI " }));
  assert.deepEqual(
    query.map((player) => player.id),
    ["robert-lewandowski"],
  );
});

test("appliedCriteriaCount is 0 for the defaults", () => {
  assert.equal(appliedCriteriaCount(DEFAULT_LIST_FILTERS, "camp"), 0);
});

test("appliedCriteriaCount counts foot boxes, traits and set ranges only", () => {
  const list: ListFilters = {
    ...DEFAULT_LIST_FILTERS,
    positions: ["BR", "LO"],
    query: "ki",
    onlySelected: true,
    onlyCamp: true,
    foot: { left: true, right: true },
    traits: ["pace", "leader", "aerial"],
    ranges: {
      age: { min: 20, max: null },
      form: { min: null, max: 90 },
      quality: { min: null, max: null },
      campImpact: { min: -2, max: null },
    },
  };
  assert.equal(appliedCriteriaCount(list, "final"), 8);
  assert.equal(appliedCriteriaCount(list, "camp"), 7);
});

test("clearDetailFilters resets foot, traits and ranges to the defaults", () => {
  assert.deepEqual(clearDetailFilters(), {
    foot: DEFAULT_LIST_FILTERS.foot,
    traits: DEFAULT_LIST_FILTERS.traits,
    ranges: DEFAULT_LIST_FILTERS.ranges,
  });
});
