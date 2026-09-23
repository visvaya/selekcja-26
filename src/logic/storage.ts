import { APP_CONFIG } from "../data/constants.ts";
import type { GameState } from "../data/types.ts";
import { decodeSave, encodeSave } from "./save-format.ts";
import type { LoadedSave } from "./save-format.ts";

const STORAGE_KEY = APP_CONFIG.storageKey;
let pendingSave: Promise<unknown> = Promise.resolve();

export type SaveFailureReason = "unavailable" | "quota" | "failed";
export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SaveFailureReason };

interface StorageBackend {
  load: () => Promise<string | null>;
  save: (value: string) => Promise<unknown>;
  remove: () => Promise<unknown>;
}

// The browser's localStorage, probed with a throwaway key so private-mode or disabled storage
// is detected without touching the real save.
function getLocalBackend(): StorageBackend | null {
  if (typeof window === "undefined") return null;
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

function classifyFailure(error: unknown): SaveFailureReason {
  if (typeof error === "object" && error !== null) {
    const { name, code } = error as { name?: unknown; code?: unknown };
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED")
      return "quota";
    if (code === 22 || code === 1014) return "quota";
  }
  return "failed";
}

export async function loadGame(): Promise<LoadedSave> {
  try {
    const raw = await getLocalBackend()?.load();
    if (raw) return decodeSave(raw);
  } catch {
    /* An unreadable backend behaves like an empty one. */
  }
  return { state: null, discardedForRulesChange: false };
}

async function performSave(value: string): Promise<SaveResult> {
  const local = getLocalBackend();
  if (!local) return { ok: false, reason: "unavailable" };
  try {
    await local.save(value);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyFailure(error) };
  }
}

export async function saveGame(state: GameState): Promise<SaveResult> {
  const value = encodeSave(state);
  const thisSave = pendingSave.then(() => performSave(value));
  // Keep the chain alive even if `thisSave` ever rejects, so a later save is never skipped.
  pendingSave = thisSave.catch(() => undefined);
  return thisSave;
}

export async function clearGame(): Promise<void> {
  try {
    await getLocalBackend()?.remove();
  } catch {
    // Storage is optional.
  }
}
