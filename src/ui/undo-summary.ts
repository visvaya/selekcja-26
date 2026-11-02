import { players } from "../data/catalog.ts";
import type { EventId } from "../data/events.ts";
import type { GameState, PlayerId, SystemId } from "../data/types.ts";
import { UI_TEXT as text } from "./text.ts";

export type UndoSummary =
  | { kind: "finish" }
  | { kind: "completeCamp" }
  | { kind: "start" }
  | { kind: "event"; eventId: EventId }
  | { kind: "system"; system: SystemId }
  | { kind: "callUp"; name: string }
  | { kind: "callUps"; count: number }
  | { kind: "release"; name: string }
  | { kind: "releases"; count: number }
  | { kind: "other" };

function playerName(id: PlayerId): string {
  return players.find((player) => player.id === id)?.name ?? id;
}

function missingFrom(source: Set<PlayerId>, target: Set<PlayerId>) {
  return [...source].filter((id) => !target.has(id));
}

function playersSummary(before: GameState, after: GameState): UndoSummary {
  const undone = missingFrom(before.selected, after.selected);
  const restored = missingFrom(after.selected, before.selected);
  if (undone.length > 0 && restored.length === 0)
    return undone.length === 1
      ? { kind: "callUp", name: playerName(undone[0]!) }
      : { kind: "callUps", count: undone.length };
  if (restored.length > 0 && undone.length === 0)
    return restored.length === 1
      ? { kind: "release", name: playerName(restored[0]!) }
      : { kind: "releases", count: restored.length };
  return { kind: "other" };
}

// Describes what an undo reverted, comparing the state before and after it. Screen-level
// changes win over the player changes they carry (the camp end also clears the selection).
export function summarizeUndo(
  before: GameState,
  after: GameState,
): UndoSummary {
  if (before.report && !after.report) return { kind: "finish" };
  if (before.stage === "final" && after.stage === "camp")
    return { kind: "completeCamp" };
  if (before.started && !after.started) return { kind: "start" };
  const eventId = [...before.events].find((id) => !after.events.has(id));
  if (eventId !== undefined)
    return { kind: "event", eventId: eventId as EventId };
  if (before.system !== after.system)
    return { kind: "system", system: after.system };
  return playersSummary(before, after);
}

// The sentence the visible message shows; the announcement adds the squad count.
export function undoSentence(summary: UndoSummary): string {
  const copy = text.undone;
  switch (summary.kind) {
    case "event":
      return copy.event(text.events[summary.eventId].title);
    case "system":
      return copy.system(text.systems[summary.system].name);
    case "callUp":
      return copy.callUp(summary.name);
    case "callUps":
      return copy.callUps(summary.count);
    case "release":
      return copy.release(summary.name);
    case "releases":
      return copy.releases(summary.count);
    default:
      return copy[summary.kind];
  }
}
