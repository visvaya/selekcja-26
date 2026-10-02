import { nextRandom } from "./random.ts";
import { trialNote } from "./scoring.ts";
import { APP_CONFIG, GAME_RULES } from "../data/constants.ts";
import type {
  Effects,
  FinalReport,
  GameState,
  GameSnapshot,
  Player,
  PlayerId,
  ListFilters,
  SystemId,
} from "../data/types.ts";
import { DEFAULT_LIST_FILTERS } from "./list-filters.ts";

export type GameAction =
  | { type: "setSystem"; value: SystemId }
  | { type: "setList"; patch: Partial<ListFilters> }
  | { type: "start" }
  | { type: "togglePlayer"; id: PlayerId; limit: number }
  | { type: "autoFill"; selected: Set<string>; seed: number }
  | { type: "undo" }
  | { type: "clearSquad" }
  | { type: "toggleCompare"; id: PlayerId }
  | { type: "clearCompare" }
  | { type: "resolveEvent"; id: string; effects: Partial<Effects> }
  | { type: "completeCamp"; squad: Player[] }
  | { type: "finish"; report: FinalReport; seed: number }
  | { type: "reset"; seed: number }
  | { type: "hydrate"; state: GameState };

export function createInitialState(
  seed: number = APP_CONFIG.fallbackSeed,
): GameState {
  return {
    system: "4231",
    stage: "camp",
    started: false,
    selected: new Set<string>(),
    campSquad: new Set<string>(),
    trial: {},
    list: DEFAULT_LIST_FILTERS,
    events: new Set(),
    effects: { chem: 0, fit: 0, quality: 0 },
    compare: [],
    seed: seed >>> 0,
    report: null,
    history: [],
  };
}

function remember(previous: GameState, next: GameState): GameState {
  const { history: _history, list: _list, ...snapshot } = previous;
  return {
    ...next,
    history: [...previous.history, snapshot as GameSnapshot].slice(
      -GAME_RULES.undoHistoryLimitActions,
    ),
  };
}

export function reduceGameState(
  state: GameState,
  action: GameAction,
): GameState {
  switch (action.type) {
    case "setSystem":
      return action.value === state.system
        ? state
        : remember(state, { ...state, system: action.value });
    case "setList":
      return { ...state, list: { ...state.list, ...action.patch } };
    case "hydrate":
      return action.state;
    case "undo": {
      const snapshot = state.history.at(-1);
      return snapshot
        ? {
            ...snapshot,
            list: state.list,
            compare: state.compare,
            history: state.history.slice(0, -1),
          }
        : state;
    }
    case "start":
      return state.started
        ? state
        : remember(state, { ...state, started: true });
    case "togglePlayer": {
      const selected = new Set(state.selected);
      if (selected.has(action.id)) selected.delete(action.id);
      else if (selected.size < action.limit) selected.add(action.id);
      return selected.size === state.selected.size &&
        selected.has(action.id) === state.selected.has(action.id)
        ? state
        : remember(state, { ...state, selected });
    }
    case "autoFill":
      return remember(state, {
        ...state,
        selected: new Set(action.selected),
        seed: action.seed,
      });
    case "toggleCompare": {
      const compare = state.compare.includes(action.id)
        ? state.compare.filter((id) => id !== action.id)
        : [...state.compare.slice(-1), action.id];
      return { ...state, compare };
    }
    case "clearCompare":
      return { ...state, compare: [] };
    case "resolveEvent":
      return remember(state, {
        ...state,
        events: new Set([...state.events, action.id]),
        effects: {
          chem: state.effects.chem + (action.effects.chem ?? 0),
          fit: state.effects.fit + (action.effects.fit ?? 0),
          quality: state.effects.quality + (action.effects.quality ?? 0),
        },
      });
    case "completeCamp": {
      const trial = { ...state.trial };
      let seed = state.seed;
      const rules = GAME_RULES.campTrial;
      for (const player of action.squad) {
        const draw = nextRandom(seed);
        seed = draw.seed;
        const delta = Math.max(
          rules.minimumDeltaPoints,
          Math.min(
            rules.maximumDeltaPoints,
            Math.round(
              (player.form - rules.formBaselinePoints) /
                rules.formDivisorPoints +
                draw.value * rules.randomRangePoints -
                rules.randomOffsetPoints,
            ),
          ),
        );
        trial[player.id] = { delta, note: trialNote(delta) };
      }
      return remember(state, {
        ...state,
        seed,
        trial,
        stage: "final",
        campSquad: new Set(state.selected),
        selected: new Set<string>(),
        compare: [],
      });
    }
    case "finish":
      return remember(state, {
        ...state,
        report: action.report,
        seed: action.seed,
      });
    case "clearSquad":
      return state.selected.size === 0
        ? state
        : remember(state, { ...state, selected: new Set<string>() });
    case "reset":
      return createInitialState(action.seed);
    default:
      return state;
  }
}
