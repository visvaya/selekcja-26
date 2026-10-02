import type { GameState } from "../data/types.ts";
import {
  canFinalize,
  groupCounts,
  squadLimit,
  squadProblems,
} from "../logic/selection.ts";
import { boardMarkers, tallyEntries } from "../logic/squad-board.ts";
import type { GroupTally, SlotGroup } from "../logic/squad-board.ts";
import { GAME_RULES } from "../data/constants.ts";
import { joinNames } from "./text/polish-format.ts";
import { UI_TEXT as text } from "./text.ts";

// "3 napastników i 2 obrońców": largest count first, ties in group order.
export function groupPlayersText(tally: GroupTally): string {
  return joinNames(
    tallyEntries(tally).map(([group, count]) =>
      text.groupPlayers[group](count),
    ),
  );
}

export function slotGroupLabelText(group: SlotGroup): string {
  if (group.id === "free") return text.freeSlots(group.count, group.required);
  const short = text.groupShort[group.id];
  return group.aboveMinimum
    ? text.slotGroupAboveMinimum(short, group.count, group.required)
    : text.slotGroupLabel(short, group.count, group.required);
}

const capitalise = (sentence: string): string =>
  sentence.charAt(0).toUpperCase() + sentence.slice(1);

function blockedReason(state: GameState): string {
  const excess = boardMarkers(state).excess;
  const exactGoalkeepers = GAME_RULES.final.minimumPlayersByGroup.BR;
  const missing = squadProblems(state)
    .filter((issue) => issue.kind === "missing")
    .map((issue) => text.missing(issue.count, text.groupShort[issue.group]))
    .join(" • ");
  return [
    excess.total > 0 ? text.excessReason(groupPlayersText(excess.byGroup)) : "",
    state.stage === "final" && groupCounts(state).BR > exactGoalkeepers
      ? text.exactGoalkeepers(exactGoalkeepers)
      : "",
    missing ? `${capitalise(missing)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Why the stage button is blocked: "" when ready, the places left while short,
// otherwise the excess, the exact goalkeeper rule and the missing groups.
export function boardReason(state: GameState): string {
  if (canFinalize(state)) return "";
  const left = squadLimit(state) - state.selected.size;
  return left > 0 ? `${text.remaining(left)}.` : blockedReason(state);
}

export function boardHeadline(state: GameState): string {
  if (canFinalize(state)) return text.stages[state.stage].completed;
  const left = squadLimit(state) - state.selected.size;
  return left > 0 ? text.remaining(left) : blockedReason(state);
}

// The phone bar toggle: "Zostało 14 miejsc: rozwiń tablicę".
export function boardToggleName(state: GameState, open: boolean): string {
  return text.dockToggleName(boardHeadline(state), open);
}

// The toggle's description: missing groups, then outsiders, then the excess.
export function boardToggleDescription(state: GameState): string {
  const markers = boardMarkers(state);
  return [
    ...squadProblems(state)
      .filter((issue) => issue.kind === "missing")
      .map((issue) => text.missing(issue.count, text.groupShort[issue.group])),
    markers.outside.total > 0 ? text.outsideNote(markers.outside.total) : "",
    markers.excess.total > 0
      ? text.excessNote(groupPlayersText(markers.excess.byGroup))
      : "",
  ]
    .filter(Boolean)
    .join(" • ");
}
