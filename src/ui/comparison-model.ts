import type { GameState, Player } from "../data/types.ts";
import { experienceScore, groupScore, modelScore } from "../logic/scoring.ts";
import type { Trait } from "./trait-order.ts";

export { canSelectBoth } from "../logic/selection.ts";

export type ComparisonMetricId =
  | "selectionScore"
  | "quality"
  | "form"
  | "fitness"
  | "tactics"
  | "experience"
  | "chemistry"
  | "groupImpact";
export type H2hSide = { value: number; diff: number | null; better: boolean };
export type H2hRow = {
  id: ComparisonMetricId;
  left: H2hSide;
  right: H2hSide;
  tie: boolean;
};

const METRICS: readonly [
  ComparisonMetricId,
  (player: Player, state: GameState) => number,
][] = [
  ["selectionScore", (player, state) => modelScore(player, state)],
  ["quality", (player) => player.ov],
  ["form", (player) => player.form],
  ["fitness", (player) => player.fit],
  ["tactics", (player) => player.tact],
  ["experience", (player) => experienceScore(player)],
  ["chemistry", (player) => player.chem],
  ["groupImpact", (player) => groupScore(player)],
];

function side(value: number, other: number): H2hSide {
  const better = value > other;
  return { value, diff: better ? value - other : null, better };
}

export function comparisonRows(
  left: Player,
  right: Player,
  state: GameState,
): H2hRow[] {
  return METRICS.map(([id, measure]) => {
    const first = measure(left, state);
    const second = measure(right, state);
    return {
      id,
      left: side(first, second),
      right: side(second, first),
      tie: first === second,
    };
  });
}

const traitKey = (trait: Trait) => `${trait.kind}:${trait.key}`;
const byLabel = (a: Trait, b: Trait) => a.label.localeCompare(b.label, "pl");

export function splitTraits(
  left: readonly Trait[],
  right: readonly Trait[],
): { shared: Trait[]; leftOwn: Trait[]; rightOwn: Trait[] } {
  const leftKeys = new Set(left.map(traitKey));
  const rightKeys = new Set(right.map(traitKey));
  return {
    shared: left.filter((t) => rightKeys.has(traitKey(t))).sort(byLabel),
    leftOwn: left.filter((t) => !rightKeys.has(traitKey(t))).sort(byLabel),
    rightOwn: right.filter((t) => !leftKeys.has(traitKey(t))).sort(byLabel),
  };
}
