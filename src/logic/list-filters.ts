// Player list filters: which catalogue players the list shows for the current list settings.
import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type {
  GameState,
  SortId,
  ListFilters,
  Player,
  RangeBounds,
  RangeId,
  Stage,
} from "../data/types.ts";
import {
  experienceScore,
  groupScore,
  modelScore,
  trialImpact,
} from "./scoring.ts";
import { detailedPositions, preferredFoot } from "./selection.ts";

export const DEFAULT_LIST_FILTERS: ListFilters = Object.freeze({
  positions: Object.freeze([]) as unknown as ListFilters["positions"],
  query: "",
  sort: "model",
  foot: Object.freeze({ left: false, right: false }),
  traits: Object.freeze([]) as unknown as ListFilters["traits"],
  ranges: Object.freeze({}),
  onlySelected: false,
  onlyCamp: false,
});

// Applied criteria of the detailed filters panel: each foot box, each trait and each range
// with a set bound. Ranges hidden at the current stage do not count.
export function appliedCriteriaCount(list: ListFilters, stage: Stage): number {
  const feet = Number(list.foot.left) + Number(list.foot.right);
  const ranges = (
    Object.entries(list.ranges) as [RangeId, RangeBounds][]
  ).filter(([id, bounds]) => isSet(bounds) && rangeShown(id, stage)).length;
  return feet + list.traits.length + ranges;
}

export function clearDetailFilters(): Pick<
  ListFilters,
  "foot" | "traits" | "ranges"
> {
  return {
    foot: DEFAULT_LIST_FILTERS.foot,
    traits: DEFAULT_LIST_FILTERS.traits,
    ranges: DEFAULT_LIST_FILTERS.ranges,
  };
}

const rangeShown = (id: RangeId, stage: Stage): boolean =>
  !(id === "campImpact" && stage === "camp");

const RANGE_ORDER: readonly RangeId[] = [
  "age",
  "score",
  "quality",
  "form",
  "fitness",
  "tactics",
  "experience",
  "chemistry",
  "groupImpact",
  "campImpact",
];

// Ranges the panel offers at a stage, in display order ("campImpact" only at the final).
export function rangeIdsForStage(stage: Stage): RangeId[] {
  return RANGE_ORDER.filter((id) => rangeShown(id, stage));
}

// Scale of a range: min and max of its value over the catalogue for the current state, so the
// selection score follows the system and stage. The camp impact uses the fixed rule bounds.
export function rangeScale(
  id: RangeId,
  state: GameState,
): { min: number; max: number } {
  if (id === "campImpact") {
    const limit = GAME_RULES.selection.trialImpactMaximumPoints;
    return { min: -limit, max: limit };
  }
  const values = players
    .map((player) => rangeValue(id, player, state))
    .filter((value): value is number => value !== null);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function rangeValue(
  id: RangeId,
  player: Player,
  state: GameState,
): number | null {
  switch (id) {
    case "age":
      return player.age;
    case "score":
      return modelScore(player, state);
    case "quality":
      return player.ov;
    case "form":
      return player.form;
    case "fitness":
      return player.fit;
    case "tactics":
      return player.tact;
    case "experience":
      return experienceScore(player);
    case "chemistry":
      return player.chem;
    case "groupImpact":
      return groupScore(player);
    case "campImpact":
      return Object.hasOwn(state.trial, player.id)
        ? trialImpact(player, state)
        : null;
  }
}

const isSet = (bounds: RangeBounds | undefined): bounds is RangeBounds =>
  bounds !== undefined && (bounds.min !== null || bounds.max !== null);

function withinRanges(player: Player, state: GameState): boolean {
  return (Object.entries(state.list.ranges) as [RangeId, RangeBounds][])
    .filter(([id, bounds]) => isSet(bounds) && rangeShown(id, state.stage))
    .every(([id, bounds]) => {
      const value = rangeValue(id, player, state);
      return (
        value !== null &&
        (bounds.min === null || value >= bounds.min) &&
        (bounds.max === null || value <= bounds.max)
      );
    });
}

function matchesFoot(player: Player, foot: ListFilters["foot"]): boolean {
  if (foot.left && foot.right) return preferredFoot(player) === "both";
  if (foot.left) return preferredFoot(player) === "left";
  if (foot.right) return preferredFoot(player) === "right";
  return true;
}

export function matchesListFilters(player: Player, state: GameState): boolean {
  const list = state.list;
  const positions = detailedPositions(player);
  const query = list.query.trim().toLocaleLowerCase("pl");
  return (
    (list.positions.length === 0 ||
      list.positions.some((position) => positions.includes(position))) &&
    `${player.name} ${player.club} ${positions.join(" ")}`
      .toLocaleLowerCase("pl")
      .includes(query) &&
    matchesFoot(player, list.foot) &&
    list.traits.every((trait) => player.roles.includes(trait)) &&
    (!list.onlySelected || state.selected.has(player.id)) &&
    (!list.onlyCamp ||
      state.stage === "camp" ||
      state.campSquad.has(player.id)) &&
    withinRanges(player, state)
  );
}

export function visiblePlayers(state: GameState): Player[] {
  const matching = players.filter((player) =>
    matchesListFilters(player, state),
  );
  const comparators: Record<SortId, (left: Player, right: Player) => number> = {
    model: (left, right) => modelScore(right, state) - modelScore(left, state),
    quality: (left, right) => right.ov - left.ov,
    form: (left, right) => right.form - left.form,
    fitness: (left, right) => right.fit - left.fit,
    tactics: (left, right) => right.tact - left.tact,
    experience: (left, right) => experienceScore(right) - experienceScore(left),
    group: (left, right) => groupScore(right) - groupScore(left),
    young: (left, right) => left.age - right.age,
    old: (left, right) => right.age - left.age,
    name: (left, right) => left.name.localeCompare(right.name, "pl"),
  };
  return matching.sort(comparators[state.list.sort]);
}
