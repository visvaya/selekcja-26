import { APP_CONFIG } from "../data/constants.ts";
import type { GameState } from "../data/types.ts";
import { decodeSave, encodeSave } from "./save-format.ts";
import type { LoadedSave } from "./save-format.ts";

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

// A remote-storage backend, when the host exposes one (e.g. a hosted "window.storage" API).
function getPrimaryBackend(): StorageBackend | null {
  if (typeof window === "undefined") return null;
  if (
    !window.storage ||
    typeof window.storage.get !== "function" ||
    typeof window.storage.set !== "function"
  )
    return null;
  const backend = window.storage;
  return {
    load: async () => (await backend.get(STORAGE_KEY))?.value ?? null,
    save: async (value: string) => backend.set(STORAGE_KEY, value),
    remove: async () => backend.delete?.(STORAGE_KEY),
  };
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
    const primary = getPrimaryBackend();
    const local = getLocalBackend();
    // A local copy only survives when the last primary write failed and fell back to it, so
    // when both backends exist and local still holds a value, that value is the newer one.
    let fallback: string | null = null;
    if (primary && local) {
      try {
        fallback = await local.load();
      } catch {
        /* A local read failure falls through to the primary read below, not to "no save". */
      }
    }
    const raw = fallback ?? (await (primary ?? local)?.load());
    if (raw) return decodeSave(raw);
  } catch {
    /* An unreadable backend behaves like an empty one. */
  }
  return { state: null, discardedForRulesChange: false };
}

async function writeToBackend(
  backend: StorageBackend,
  value: string,
): Promise<SaveResult> {
  try {
    await backend.save(value);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyFailure(error) };
  }
}

async function performSave(value: string): Promise<SaveResult> {
  let primary: StorageBackend | null;
  let local: StorageBackend | null;
  try {
    primary = getPrimaryBackend();
    local = getLocalBackend();
  } catch (error) {
    // Detecting a backend can itself throw (e.g. a host-provided accessor that fails); that is
    // a save failure, not a rejection, so the pending-save chain below never breaks.
    return { ok: false, reason: classifyFailure(error) };
  }
  if (!primary) {
    if (!local) return { ok: false, reason: "unavailable" };
    return writeToBackend(local, value);
  }

  const primaryResult = await writeToBackend(primary, value);
  if (primaryResult.ok) {
    try {
      await local?.remove();
    } catch {
      /* Removing the stale local fallback is best-effort. */
    }
    return primaryResult;
  }
  if (!local) return primaryResult;
  return writeToBackend(local, value);
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
    await getPrimaryBackend()?.remove();
  } catch {
    // Storage is optional.
  }
  try {
    await getLocalBackend()?.remove();
  } catch {
    // Storage is optional.
  }
}
