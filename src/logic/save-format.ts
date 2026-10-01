// Save format: encodes GameState as schema version 4 and decodes every supported version.
// Anything that does not validate decodes to null, and the game starts fresh.
import { players, positionOrder, systems } from "../data/catalog.ts";
import { APP_CONFIG, GAME_RULES, RULES_REVISION } from "../data/constants.ts";
import { EVENTS } from "../data/events.ts";
import type {
  GameSnapshot,
  GameState,
  ListFilters,
  RangeId,
  SortId,
  FinalReport,
  KnockoutRoundId,
} from "../data/types.ts";
import {
  LEGACY_RULES_REVISION,
  migrateLegacyState,
  migrateV3State,
} from "./save-migration.ts";
import { trialNote } from "./scoring.ts";

type RawRecord = Record<string, unknown>;

const PLAYER_IDS = new Set(players.map((player) => player.id));
const SYSTEM_IDS = new Set<unknown>(systems.map((system) => system.id));
const EVENT_IDS = new Set<unknown>(EVENTS.map((event) => event.id));
const POSITIONS = new Set<unknown>(Object.keys(positionOrder));
const ROLE_IDS = new Set<unknown>(players.flatMap((player) => player.roles));
const RANGE_IDS = new Set<string>(
  Object.keys({
    age: 0,
    score: 0,
    quality: 0,
    form: 0,
    fitness: 0,
    tactics: 0,
    experience: 0,
    chemistry: 0,
    groupImpact: 0,
    campImpact: 0,
  } satisfies Record<RangeId, 0>),
);
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

// note is recomputed from delta by restoreSnapshot below, so it is never validated here: a save
// missing it, or carrying a stale, foreign or non-string value, still loads instead of being
// rejected.
function isTrial(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([id, result]) =>
        PLAYER_IDS.has(id) && isRecord(result) && isNumber(result.delta),
    )
  );
}

const KNOCKOUT_ROUND_IDS: readonly unknown[] = Object.keys({
  roundOf16: 0,
  quarterfinal: 0,
  semifinal: 0,
  final: 0,
} satisfies Record<KnockoutRoundId, 0>);

const isGoals = (value: unknown): boolean =>
  Number.isInteger(value) && (value as number) >= 0;

function isMatchScore(value: unknown): value is RawRecord {
  if (!isRecord(value)) return false;
  const penalties = value.penalties;
  return (
    isGoals(value.goalsFor) &&
    isGoals(value.goalsAgainst) &&
    typeof value.opponent === "string" &&
    (penalties === null ||
      (isRecord(penalties) &&
        isGoals(penalties.goalsFor) &&
        isGoals(penalties.goalsAgainst)))
  );
}

// Knockout rounds are stored in playing order, starting from the round of 16.
function isStory(story: RawRecord): boolean {
  const { groupMatches, knockout } = story;
  return (
    isNumber(story.groupPoints) &&
    Array.isArray(groupMatches) &&
    groupMatches.length === GAME_RULES.groupMatchesCount &&
    groupMatches.every(isMatchScore) &&
    Array.isArray(knockout) &&
    knockout.length <= KNOCKOUT_ROUND_IDS.length &&
    knockout.every(
      (match, index) =>
        isMatchScore(match) && match.round === KNOCKOUT_ROUND_IDS[index],
    ) &&
    typeof story.outcome === "string" &&
    isNumber(story.seed)
  );
}

// The flat story written under rules revision 1, kept for frozen reports.
function isLegacyStory(story: RawRecord): boolean {
  return (
    isStringArray(story.matches) &&
    typeof story.outcome === "string" &&
    typeof story.last === "string" &&
    isNumber(story.seed)
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
    (isStory(story) || isLegacyStory(story))
  );
}

function isSnapshot(value: unknown): value is GameSnapshot {
  if (!isRecord(value)) return false;
  const effects = value.effects;
  return (
    SYSTEM_IDS.has(value.system) &&
    (value.stage === "camp" || value.stage === "final") &&
    typeof value.started === "boolean" &&
    isPlayerIdArray(value.selected) &&
    isPlayerIdArray(value.campSquad) &&
    isTrial(value.trial) &&
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

const isBound = (value: unknown): boolean => value === null || isNumber(value);

function isRanges(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([id, bounds]) =>
        RANGE_IDS.has(id) &&
        isRecord(bounds) &&
        isBound(bounds.min) &&
        isBound(bounds.max),
    )
  );
}

function isListFilters(value: unknown): value is ListFilters {
  if (!isRecord(value)) return false;
  const foot = value.foot;
  return (
    Array.isArray(value.positions) &&
    value.positions.every((position) => POSITIONS.has(position)) &&
    typeof value.query === "string" &&
    SORT_IDS.has(value.sort) &&
    isRecord(foot) &&
    typeof foot.left === "boolean" &&
    typeof foot.right === "boolean" &&
    Array.isArray(value.traits) &&
    value.traits.every((trait) => ROLE_IDS.has(trait)) &&
    isRanges(value.ranges) &&
    typeof value.onlySelected === "boolean" &&
    typeof value.onlyCamp === "boolean"
  );
}

function restoreList(value: ListFilters): ListFilters {
  return {
    positions: [...value.positions],
    query: value.query,
    sort: value.sort,
    foot: { left: value.foot.left, right: value.foot.right },
    traits: [...value.traits],
    ranges: Object.fromEntries(
      Object.entries(value.ranges).map(([id, bounds]) => [
        id,
        { min: bounds.min, max: bounds.max },
      ]),
    ),
    onlySelected: value.onlySelected,
    onlyCamp: value.onlyCamp,
  };
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
  const { history: _history, list: _list, ...snapshot } = value as GameState;
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
      list: state.list,
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

// Returns the state in the version 4 shape with the rules revision it was saved under.
function upgrade(saved: RawRecord): { state: unknown; rulesRevision: unknown } {
  if (saved.schemaVersion === 1 || saved.schemaVersion === 2)
    return {
      state: migrateV3State(
        migrateLegacyState(saved.state, saved.schemaVersion),
      ),
      rulesRevision: LEGACY_RULES_REVISION,
    };
  if (saved.schemaVersion === 3)
    return {
      state: migrateV3State(saved.state),
      rulesRevision: saved.rulesRevision,
    };
  return saved.schemaVersion === APP_CONFIG.saveSchemaVersion
    ? { state: saved.state, rulesRevision: saved.rulesRevision }
    : { state: null, rulesRevision: null };
}

function restoreState(state: unknown): GameState | null {
  if (!isSnapshot(state)) return null;
  const { history, list } = state as unknown as RawRecord;
  if (!isListFilters(list)) return null;
  if (
    !Array.isArray(history) ||
    history.length > GAME_RULES.undoHistoryLimitActions ||
    !history.every(isSnapshot)
  )
    return null;
  return {
    ...restoreSnapshot(state),
    list: restoreList(list),
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
