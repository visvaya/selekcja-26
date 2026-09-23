import { APP_CONFIG } from "../data/constants.ts";
import type { GameState } from "../data/types.ts";
import { decodeSave, encodeSave } from "./save-format.ts";

declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<unknown>;
      delete?: (key: string) => Promise<unknown>;
    };
  }
}

const STORAGE_KEY = APP_CONFIG.storageKey;
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
    return raw ? decodeSave(raw) : null;
  } catch {
    return null;
  }
}

export async function saveGame(state: GameState): Promise<void> {
  const value = encodeSave(state);
  pendingSave = pendingSave.then(async () => {
    try {
      await getBackend()?.save(value);
    } catch {
      /* Storage is optional; the game remains playable when unavailable. */
    }
  });
  await pendingSave;
}

export async function clearGame(): Promise<void> {
  try {
    await getBackend()?.remove();
  } catch {
    // Storage is optional.
  }
}
