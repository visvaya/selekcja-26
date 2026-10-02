import { GAME_RULES } from "../data/constants.ts";
import type { GameState, GroupPosition, Player } from "../data/types.ts";
import {
  formationOutsiders,
  selectedPlayers,
  squadLimit,
} from "./selection.ts";

export type SlotKind = "filled" | "outside" | "excess" | "empty";
// group is null only for empty pool squares.
export type SlotSquare = { kind: SlotKind; group: GroupPosition | null };
export type SlotGroup = {
  id: GroupPosition | "free";
  // Group: called-up players of the group; free: players placed in the pool.
  count: number;
  // Group: minimum or exact quota; free: pool size.
  required: number;
  // count > required for a group without an exact quota.
  aboveMinimum: boolean;
  squares: SlotSquare[];
};
export type GroupTally = Readonly<Record<GroupPosition, number>>;
export type BoardMarkers = {
  outside: { total: number; byGroup: GroupTally };
  excess: { total: number; byGroup: GroupTally };
};

export const BOARD_GROUP_ORDER: readonly GroupPosition[] = [
  "BR",
  "OBR",
  "POM",
  "ATA",
];

const hasExactQuota = (state: GameState, group: GroupPosition): boolean =>
  state.stage === "final" && group === "BR";

function playerSquare(
  player: Player,
  outsiderIds: ReadonlySet<string>,
): SlotSquare {
  return {
    kind: outsiderIds.has(player.id) ? "outside" : "filled",
    group: player.pos,
  };
}

const excessSquare = (player: Player): SlotSquare => ({
  kind: "excess",
  group: player.pos,
});

const emptySquares = (
  count: number,
  group: GroupPosition | null,
): SlotSquare[] =>
  Array.from({ length: Math.max(0, count) }, () => ({ kind: "empty", group }));

// Squares per group (formation players first, then outsiders), then the pool
// for surplus players and red excess squares for surplus beyond the pool.
export function slotGroups(state: GameState): SlotGroup[] {
  const minimums = GAME_RULES[state.stage].minimumPlayersByGroup;
  const outsiderIds = new Set(
    formationOutsiders(state).map((player) => player.id),
  );
  const squad = selectedPlayers(state);
  const surplus: Player[] = [];
  const groups = BOARD_GROUP_ORDER.map((id): SlotGroup => {
    const members = squad.filter((player) => player.pos === id);
    const ordered = [
      ...members.filter((player) => !outsiderIds.has(player.id)),
      ...members.filter((player) => outsiderIds.has(player.id)),
    ];
    const required = minimums[id];
    const shown = ordered.slice(0, required);
    const rest = ordered.slice(required);
    const exact = hasExactQuota(state, id);
    if (!exact) surplus.push(...rest);
    return {
      id,
      count: members.length,
      required,
      aboveMinimum: !exact && members.length > required,
      squares: [
        ...shown.map((player) => playerSquare(player, outsiderIds)),
        ...emptySquares(required - shown.length, id),
        ...(exact ? rest.map(excessSquare) : []),
      ],
    };
  });
  const poolSize =
    squadLimit(state) -
    BOARD_GROUP_ORDER.reduce((sum, id) => sum + minimums[id], 0);
  const placed = surplus.slice(0, poolSize);
  const free: SlotGroup = {
    id: "free",
    count: placed.length,
    required: poolSize,
    aboveMinimum: false,
    squares: [
      ...placed.map((player) => playerSquare(player, outsiderIds)),
      ...emptySquares(poolSize - placed.length, null),
      ...surplus.slice(poolSize).map(excessSquare),
    ],
  };
  return [...groups, free];
}

function tallyOf(groups: readonly (GroupPosition | null)[]): {
  total: number;
  byGroup: GroupTally;
} {
  const byGroup = Object.fromEntries(
    BOARD_GROUP_ORDER.map((id) => [
      id,
      groups.filter((group) => group === id).length,
    ]),
  ) as Record<GroupPosition, number>;
  return { total: groups.length, byGroup };
}

export function boardMarkers(state: GameState): BoardMarkers {
  const excessGroups = slotGroups(state)
    .flatMap((group) => group.squares)
    .filter((square) => square.kind === "excess")
    .map((square) => square.group);
  return {
    outside: tallyOf(formationOutsiders(state).map((player) => player.pos)),
    excess: tallyOf(excessGroups),
  };
}

// Non-zero entries, largest count first, ties in group order (stable sort).
export function tallyEntries(tally: GroupTally): [GroupPosition, number][] {
  return BOARD_GROUP_ORDER.map((id): [GroupPosition, number] => [id, tally[id]])
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1]);
}
