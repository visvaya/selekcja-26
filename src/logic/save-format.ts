// Save format: encodes GameState as schema version 3 and decodes every supported version.
// Anything that does not validate decodes to null, and the game starts fresh.
import {
  players,
  positionOrder,
  priorities,
  systems,
} from "../data/catalog.ts";
import { APP_CONFIG, GAME_RULES, RULES_REVISION } from "../data/constants.ts";
import { EVENTS } from "../data/events.ts";
import type {
  GameSnapshot,
  GameState,
  SortId,
  FinalReport,
} from "../data/types.ts";
import { LEGACY_RULES_REVISION, migrateLegacyState } from "./save-migration.ts";
import { trialNote } from "./scoring.ts";

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
const isRevision = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isPlayerIdArray = (value: unknown): value is string[] =>
  isStringArray(value) && value.every((id) => PLAYER_IDS.has(id));

// note is not trusted (it is recomputed from delta by restoreSnapshot below), so a string note
// is accepted but not required: a save missing it, or carrying a stale or foreign value, still
// loads instead of being rejected.
function isTrial(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([id, result]) =>
        PLAYER_IDS.has(id) &&
        isRecord(result) &&
        isNumber(result.delta) &&
        (result.note === undefined || typeof result.note === "string"),
    )
  );
}

// Report squads may name players that a later catalogue no longer has; they are skipped when
// the report is shown, so only the shape is checked here.
function isReport(value: unknown): value is FinalReport {
  if (!isRecord(value)) return false;
  const story = value.story;
  return (
    isRevision(value.rulesRevision) &&
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

// note is derived purely from delta (see trialNote); it is never trusted from the save, so it
// is recomputed here for every entry instead of carrying over whatever was stored.
function restoreTrial(trial: GameSnapshot["trial"]): GameSnapshot["trial"] {
  return Object.fromEntries(
    Object.entries(trial).map(([id, result]) => [
      id,
      { delta: result.delta, note: trialNote(result.delta) },
    ]),
  );
}

function restoreSnapshot(value: GameSnapshot): GameSnapshot {
  return {
    ...value,
    selected: new Set(value.selected),
    campSquad: new Set(value.campSquad),
    events: new Set(value.events),
    trial: restoreTrial(value.trial),
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
    rulesRevision: RULES_REVISION,
    state: {
      ...serializeSnapshot(state),
      history: state.history.map(serializeSnapshot),
    },
  });
}

export interface LoadedSave {
  state: GameState | null;
  // True when an unfinished game was dropped because it was saved under other rules.
  discardedForRulesChange: boolean;
}

const EMPTY: LoadedSave = { state: null, discardedForRulesChange: false };

// Returns the state in the version 3 shape with the rules revision it was saved under.
function upgrade(saved: RawRecord): { state: unknown; rulesRevision: unknown } {
  if (saved.schemaVersion === 1 || saved.schemaVersion === 2)
    return {
      state: migrateLegacyState(saved.state, saved.schemaVersion),
      rulesRevision: LEGACY_RULES_REVISION,
    };
  return saved.schemaVersion === APP_CONFIG.saveSchemaVersion
    ? { state: saved.state, rulesRevision: saved.rulesRevision }
    : { state: null, rulesRevision: null };
}

function restoreState(state: unknown): GameState | null {
  if (!isSnapshot(state)) return null;
  const history = (state as unknown as RawRecord).history;
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

// A save from other rules keeps a finished report as frozen history (no undo, because the
// snapshots were computed under the old rules); an unfinished game is dropped with a notice.
export function decodeSave(raw: string): LoadedSave {
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!isRecord(saved)) return EMPTY;
  const upgraded = upgrade(saved);
  const state = restoreState(upgraded.state);
  if (!state || !isRevision(upgraded.rulesRevision)) return EMPTY;
  if (upgraded.rulesRevision === RULES_REVISION)
    return { state, discardedForRulesChange: false };
  return state.report
    ? { state: { ...state, history: [] }, discardedForRulesChange: false }
    : { state: null, discardedForRulesChange: true };
}
