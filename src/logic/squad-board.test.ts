import test from "node:test";
import assert from "node:assert/strict";
import { players, systems } from "../data/catalog.ts";
import type {
  GameState,
  GroupPosition,
  Player,
  Stage,
  SystemId,
} from "../data/types.ts";
import { randomInt } from "./random.ts";
import {
  detailedPositions,
  formationOutsiders,
  groupCounts,
  squadLimit,
} from "./selection.ts";
import {
  BOARD_GROUP_ORDER,
  boardMarkers,
  slotGroups,
  tallyEntries,
} from "./squad-board.ts";
import type { SlotGroup, SlotKind, SlotSquare } from "./squad-board.ts";
import { createInitialState, reduceGameState } from "./state.ts";

function boardState(
  stage: Stage,
  system: SystemId,
  squad: readonly Player[],
  seed = 7,
): GameState {
  const started = reduceGameState(
    reduceGameState(createInitialState(seed), {
      type: "setSystem",
      value: system,
    }),
    { type: "start" },
  );
  return {
    ...started,
    stage,
    selected: new Set(squad.map((player) => player.id)),
  };
}

const fitsSystem = (player: Player, system: SystemId): boolean => {
  const fits = systems.find((candidate) => candidate.id === system)!.fits;
  return detailedPositions(player).some((position) => fits.includes(position));
};

function pick(count: number, predicate: (player: Player) => boolean): Player[] {
  const found = players.filter(predicate).slice(0, count);
  assert.equal(found.length, count, "catalogue has enough players");
  return found;
}

const inGroup = (group: GroupPosition) => (player: Player) =>
  player.pos === group;

const group = (groups: SlotGroup[], id: SlotGroup["id"]): SlotGroup =>
  groups.find((candidate) => candidate.id === id)!;

const kinds = (slot: SlotGroup): SlotKind[] =>
  slot.squares.map((square) => square.kind);

const label = (slot: SlotGroup): string => `${slot.count}/${slot.required}`;

test("an empty camp squad shows only empty squares", () => {
  const groups = slotGroups(boardState("camp", "4231", []));
  assert.deepEqual(
    groups.map((slot) => slot.id),
    [...BOARD_GROUP_ORDER, "free"],
  );
  assert.deepEqual(
    groups.map((slot) => `${slot.id} ${label(slot)}`),
    ["BR 0/2", "OBR 0/7", "POM 0/7", "ATA 0/3", "free 0/4"],
  );
  const squares = groups.flatMap((slot) => slot.squares);
  assert.equal(squares.length, 23);
  assert.ok(squares.every((square) => square.kind === "empty"));
  for (const slot of groups)
    assert.ok(
      slot.squares.every(
        (square) => square.group === (slot.id === "free" ? null : slot.id),
      ),
    );
  assert.deepEqual(boardMarkers(boardState("camp", "4231", [])), {
    outside: { total: 0, byGroup: { BR: 0, OBR: 0, POM: 0, ATA: 0 } },
    excess: { total: 0, byGroup: { BR: 0, OBR: 0, POM: 0, ATA: 0 } },
  });
});

test("an empty final squad has a pool of 3 and exactly 3 goalkeepers", () => {
  const groups = slotGroups(boardState("final", "4231", []));
  assert.equal(label(group(groups, "free")), "0/3");
  assert.equal(group(groups, "BR").required, 3);
  assert.equal(groups.flatMap((slot) => slot.squares).length, 26);
});

test("outsiders fill the group first after formation players, then the pool", () => {
  const system = "3421";
  const squad = [
    ...pick(2, inGroup("BR")),
    ...pick(3, (p) => p.pos === "OBR" && fitsSystem(p, system)),
    ...pick(3, (p) => p.pos === "POM" && fitsSystem(p, system)),
    ...pick(1, (p) => p.pos === "ATA" && detailedPositions(p).includes("N")),
    ...pick(5, (p) => p.pos === "ATA" && !fitsSystem(p, system)),
  ];
  const state = boardState("camp", system, squad);
  const groups = slotGroups(state);
  const attack = group(groups, "ATA");
  assert.equal(attack.count, 6);
  assert.equal(attack.aboveMinimum, true);
  assert.deepEqual(kinds(attack), ["filled", "outside", "outside"]);
  const free = group(groups, "free");
  assert.equal(label(free), "3/4");
  assert.deepEqual(
    free.squares.map((square) => `${square.kind} ${square.group}`),
    ["outside ATA", "outside ATA", "outside ATA", "empty null"],
  );
  const markers = boardMarkers(state);
  assert.equal(markers.outside.total, 5);
  assert.deepEqual(markers.outside.byGroup, { BR: 0, OBR: 0, POM: 0, ATA: 5 });
  assert.equal(markers.excess.total, 0);
});

test("a fourth goalkeeper in the final stays in the group as excess", () => {
  const squad = [
    ...pick(4, inGroup("BR")),
    ...pick(6, inGroup("OBR")),
    ...pick(6, inGroup("POM")),
    ...pick(5, inGroup("ATA")),
  ];
  const state = boardState("final", "4231", squad);
  const keepers = group(slotGroups(state), "BR");
  assert.equal(keepers.count, 4);
  assert.equal(keepers.aboveMinimum, false);
  assert.deepEqual(kinds(keepers), ["filled", "filled", "filled", "excess"]);
  assert.ok(keepers.squares.every((square) => square.group === "BR"));
  const markers = boardMarkers(state);
  assert.equal(markers.excess.total, 1);
  assert.deepEqual(markers.excess.byGroup, { BR: 1, OBR: 0, POM: 0, ATA: 0 });
});

test("a third goalkeeper at the camp goes to the pool", () => {
  const groups = slotGroups(boardState("camp", "4231", pick(3, inGroup("BR"))));
  const keepers = group(groups, "BR");
  assert.equal(keepers.count, 3);
  assert.equal(keepers.aboveMinimum, true);
  assert.equal(keepers.squares.length, 2);
  const free = group(groups, "free");
  assert.equal(free.count, 1);
  const pooled: SlotSquare = { kind: "filled", group: "BR" };
  assert.deepEqual(free.squares[0], pooled);
});

test("surplus that does not fit the pool is drawn as excess after it", () => {
  const squad = [
    ...pick(2, inGroup("BR")),
    ...pick(16, inGroup("POM")),
    ...pick(3, inGroup("ATA")),
  ];
  const state = boardState("camp", "4231", squad);
  const groups = slotGroups(state);
  assert.ok(kinds(group(groups, "OBR")).every((kind) => kind === "empty"));
  const free = group(groups, "free");
  assert.equal(label(free), "4/4");
  assert.equal(free.squares.length, 9);
  assert.ok(
    free.squares
      .slice(0, 4)
      .every((square) => square.kind !== "empty" && square.group === "POM"),
  );
  assert.deepEqual(
    free.squares.slice(4).map((square) => `${square.kind} ${square.group}`),
    Array.from({ length: 5 }, () => "excess POM"),
  );
  const markers = boardMarkers(state);
  assert.equal(markers.excess.total, 5);
  assert.equal(markers.excess.byGroup.POM, 5);
});

test("squares account for every called-up player in random squads", () => {
  const systemIds: SystemId[] = ["4231", "3421", "433"];
  const stages: Stage[] = ["camp", "final"];
  for (let seed = 1; seed <= 200; seed += 1) {
    let rng = seed;
    const stage = stages[seed % 2]!;
    const system = systemIds[seed % 3]!;
    const limit = squadLimit(boardState(stage, system, []));
    const sizeDraw = randomInt(rng, limit + 1);
    rng = sizeDraw.seed;
    const pool = [...players];
    const squad: Player[] = [];
    while (squad.length < sizeDraw.value) {
      const draw = randomInt(rng, pool.length);
      rng = draw.seed;
      squad.push(...pool.splice(draw.value, 1));
    }
    const state = boardState(stage, system, squad, seed);
    const groups = slotGroups(state);
    const counted = groups
      .flatMap((slot) => slot.squares)
      .filter((square) => square.kind !== "empty").length;
    assert.equal(counted, state.selected.size, `seed ${seed}`);
    const counts = groupCounts(state);
    for (const slot of groups)
      if (slot.id !== "free") assert.equal(slot.count, counts[slot.id]);
    assert.equal(
      boardMarkers(state).outside.total,
      formationOutsiders(state).length,
    );
  }
});

test("tally entries drop zeros and sort by count, ties in group order", () => {
  assert.deepEqual(tallyEntries({ BR: 0, OBR: 2, POM: 0, ATA: 3 }), [
    ["ATA", 3],
    ["OBR", 2],
  ]);
  assert.deepEqual(tallyEntries({ BR: 1, OBR: 0, POM: 1, ATA: 1 }), [
    ["BR", 1],
    ["POM", 1],
    ["ATA", 1],
  ]);
});
