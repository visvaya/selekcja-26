import type { GameSnapshot, GameState } from "../data/types.ts";

declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<unknown>;
      delete?: (key: string) => Promise<unknown>;
    };
  }
}

const STORAGE_KEY = "selekcja-26-game";
export const SCHEMA_VERSION = 2;
let pendingSave: Promise<void> = Promise.resolve();

interface StorageBackend {
  load: () => Promise<string | null>;
  save: (value: string) => Promise<unknown>;
  remove: () => Promise<unknown>;
}

function getBackend(): StorageBackend | null {
  if (typeof window === "undefined") return null;
  if (
    window.storage &&
    typeof window.storage.get === "function" &&
    typeof window.storage.set === "function"
  ) {
    const backend = window.storage;
    return {
      load: async () => (await backend.get(STORAGE_KEY))?.value ?? null,
      save: async (value: string) => backend.set(STORAGE_KEY, value),
      remove: async () => backend.delete?.(STORAGE_KEY),
    };
  }
  try {
    const storage = window.localStorage;
    const checkKey = `${STORAGE_KEY}-check`;
    storage.setItem(checkKey, "1");
    storage.removeItem(checkKey);
    return {
      load: async () => storage.getItem(STORAGE_KEY),
      save: async (value: string) => storage.setItem(STORAGE_KEY, value),
      remove: async () => storage.removeItem(STORAGE_KEY),
    };
  } catch {
    return null;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await getBackend()?.load();
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (![1, SCHEMA_VERSION].includes(saved.schemaVersion) || !saved.state)
      return null;
    const state = saved.state;
    if (
      !["camp", "final"].includes(state.stage) ||
      !Array.isArray(state.selected) ||
      !Array.isArray(state.campSquad) ||
      !Array.isArray(state.events) ||
      typeof state.seed !== "number" ||
      typeof state.system !== "string" ||
      typeof state.priority !== "string" ||
      !state.effects ||
      !state.trial ||
      !Array.isArray(state.compare)
    )
      return null;
    if (saved.schemaVersion === SCHEMA_VERSION && !Array.isArray(state.history))
      return null;
    const history = saved.schemaVersion === 1 ? [] : state.history;
    if (
      history.length > 50 ||
      history.some((snapshot: unknown) => !isSavedSnapshot(snapshot))
    )
      return null;
    return {
      ...restoreSnapshot(state),
      history: history.map(restoreSnapshot),
    };
  } catch {
    return null;
  }
}

export async function saveGame(state: GameState): Promise<void> {
  const value = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    state: {
      ...serializeSnapshot(state),
      history: state.history.map(serializeSnapshot),
    },
  });
  pendingSave = pendingSave.then(async () => {
    try {
      await getBackend()?.save(value);
    } catch {
      /* Storage is optional; the game remains playable when unavailable. */
    }
  });
  await pendingSave;
}

function isSavedSnapshot(value: unknown): value is GameSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return (
    Array.isArray(snapshot.selected) &&
    Array.isArray(snapshot.campSquad) &&
    Array.isArray(snapshot.events) &&
    typeof snapshot.seed === "number" &&
    ["camp", "final"].includes(String(snapshot.stage))
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

export async function clearGame(): Promise<void> {
  try {
    await getBackend()?.remove();
  } catch {
    // Storage is optional.
  }
}
