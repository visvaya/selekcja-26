// Save format: encodes GameState as schema version 3 and decodes every supported version.
// Anything that does not validate decodes to null, and the game starts fresh.
import {
  players,
  positionOrder,
  priorities,
  systems,
} from "../data/catalog.ts";
import { APP_CONFIG, GAME_RULES } from "../data/constants.ts";
import { EVENTS } from "../data/events.ts";
import type {
  GameSnapshot,
  GameState,
  SortId,
  FinalReport,
} from "../data/types.ts";
import { migrateLegacyState } from "./save-migration.ts";

type RawRecord = Record<string, unknown>;

const PLAYER_IDS = new Set(players.map((player) => player.id));
const SYSTEM_IDS = new Set<unknown>(systems.map((system) => system.id));
const PRIORITY_IDS = new Set<unknown>(priorities);
const EVENT_IDS = new Set<unknown>(EVENTS.map((event) => event.id));
const FILTERS = new Set<unknown>(["ALL", ...Object.keys(positionOrder)]);
const SORT_IDS = new Set<unknown>(
  Object.keys({
    model: 0,
    quality: 0,
    form: 0,
    fitness: 0,
    tactics: 0,
    experience: 0,
    group: 0,
    young: 0,
    old: 0,
    name: 0,
  } satisfies Record<SortId, 0>),
);

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isPlayerIdArray = (value: unknown): value is string[] =>
  isStringArray(value) && value.every((id) => PLAYER_IDS.has(id));

function isTrial(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([id, result]) =>
        PLAYER_IDS.has(id) &&
        isRecord(result) &&
        isNumber(result.delta) &&
        typeof result.note === "string",
    )
  );
}

// Report squads may name players that a later catalogue no longer has; they are skipped when
// the report is shown, so only the shape is checked here.
function isReport(value: unknown): value is FinalReport {
  if (!isRecord(value)) return false;
  const story = value.story;
  return (
    isStringArray(value.squadIds) &&
    ["quality", "chem", "coverage", "luck", "points"].every((key) =>
      isNumber(value[key]),
    ) &&
    typeof value.stage === "string" &&
    typeof value.grade === "string" &&
    isStringArray(value.strengths) &&
    isStringArray(value.weak) &&
    isRecord(story) &&
    isStringArray(story.matches) &&
    typeof story.outcome === "string" &&
    typeof story.last === "string" &&
    isNumber(story.seed)
  );
}

function isSnapshot(value: unknown): value is GameSnapshot {
  if (!isRecord(value)) return false;
  const effects = value.effects;
  return (
    SYSTEM_IDS.has(value.system) &&
    PRIORITY_IDS.has(value.priority) &&
    (value.stage === "camp" || value.stage === "final") &&
    typeof value.started === "boolean" &&
    isPlayerIdArray(value.selected) &&
    isPlayerIdArray(value.campSquad) &&
    isTrial(value.trial) &&
    FILTERS.has(value.filter) &&
    typeof value.query === "string" &&
    SORT_IDS.has(value.sort) &&
    isStringArray(value.events) &&
    value.events.every((id) => EVENT_IDS.has(id)) &&
    isRecord(effects) &&
    isNumber(effects.chem) &&
    isNumber(effects.fit) &&
    isNumber(effects.quality) &&
    isPlayerIdArray(value.compare) &&
    isNumber(value.seed) &&
    (value.report === null || isReport(value.report))
  );
}

function restoreSnapshot(value: GameSnapshot): GameSnapshot {
  return {
    ...value,
    selected: new Set(value.selected),
    campSquad: new Set(value.campSquad),
    events: new Set(value.events),
  };
}

function serializeSnapshot(value: GameSnapshot) {
  const { history: _history, ...snapshot } = value as GameState;
  return {
    ...snapshot,
    selected: [...snapshot.selected],
    campSquad: [...snapshot.campSquad],
    events: [...snapshot.events],
  };
}

export function encodeSave(state: GameState): string {
  return JSON.stringify({
    schemaVersion: APP_CONFIG.saveSchemaVersion,
    state: {
      ...serializeSnapshot(state),
      history: state.history.map(serializeSnapshot),
    },
  });
}

function upgrade(saved: RawRecord): unknown {
  if (saved.schemaVersion === 1 || saved.schemaVersion === 2)
    return migrateLegacyState(saved.state, saved.schemaVersion);
  return saved.schemaVersion === APP_CONFIG.saveSchemaVersion
    ? saved.state
    : null;
}

export function decodeSave(raw: string): GameState | null {
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(saved)) return null;
  const state = upgrade(saved);
  if (!isSnapshot(state) || !isRecord(state)) return null;
  const history = (state as RawRecord).history;
  if (
    !Array.isArray(history) ||
    history.length > GAME_RULES.undoHistoryLimitActions ||
    !history.every(isSnapshot)
  )
    return null;
  return {
    ...restoreSnapshot(state),
    history: history.map(restoreSnapshot),
  };
}
