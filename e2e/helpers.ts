import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { APP_CONFIG } from "../src/data/constants.ts";
import { UI_TEXT as text } from "../src/ui/text.ts";

export { text };

export const STORAGE_KEY = APP_CONFIG.storageKey;

export const CAMP_EVENT_CHOICES = [
  text.events.doctor.choices[0]!.title,
  text.events.captain.choices[0]!.title,
  text.events.scout.choices[0]!.title,
] as const;

export async function expectSavedSchemaVersion(
  page: Page,
  version: number,
): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").schemaVersion,
        STORAGE_KEY,
      ),
    )
    .toBe(version);
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

export function dialog(page: Page): Locator {
  return page.getByRole("dialog");
}

export function saveBanner(page: Page): Locator {
  return page.locator(".save-status");
}

export function saveAlert(page: Page): Locator {
  return saveBanner(page).getByRole("alert");
}

export function saveStatusRegion(page: Page): Locator {
  return saveBanner(page).getByRole("status");
}

export type StorageFailureMode = "none" | "quota" | "failed" | "unavailable";

// Patches Storage.prototype.setItem before any page script runs, so localStorage writes for the
// save key can be forced to fail on demand. "unavailable" fails every write (including the
// probe key storage.ts uses to detect a working backend); "quota" and "failed" only fail writes
// to the real save key, leaving the probe key untouched.
export async function patchStorageFailures(
  page: Page,
  storageKey: string,
  initialMode: StorageFailureMode = "none",
): Promise<void> {
  await page.addInitScript(
    ([key, mode]) => {
      const win = window as typeof window & { saveFailureMode: string };
      win.saveFailureMode = mode!;
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (
        this: Storage,
        itemKey: string,
        value: string,
      ) {
        const active = win.saveFailureMode;
        if (active === "unavailable") throw new Error("storage disabled");
        if (active === "quota" && itemKey === key)
          throw new DOMException("full", "QuotaExceededError");
        if (active === "failed" && itemKey === key)
          throw new Error("save failed");
        return originalSetItem.call(this, itemKey, value);
      };
    },
    [storageKey, initialMode],
  );
}

export async function setStorageFailureMode(
  page: Page,
  mode: StorageFailureMode,
): Promise<void> {
  await page.evaluate((nextMode) => {
    (window as typeof window & { saveFailureMode: string }).saveFailureMode =
      nextMode;
  }, mode);
}

// Installs a window.storage backend whose set() always rejects, so the local fallback backend
// takes over silently.
export async function patchRejectingRemoteStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.storage = {
      get: async () => null,
      set: async () => Promise.reject(new Error("remote storage down")),
      delete: async () => undefined,
    };
  });
}

export function squadCount(page: Page): Locator {
  return page.locator(".count-ring b");
}

export function finalizeButton(page: Page): Locator {
  return page.locator(".dock .finalize");
}

export function dockToggle(page: Page): Locator {
  return page.locator(".dock .dock-copy");
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function readReport(page: Page) {
  const report = page.locator(".result");
  return {
    stage: await report.locator("h1").innerText(),
    grade: await report.locator(".grade").innerText(),
    matches: await report
      .locator(".report")
      .first()
      .locator("li")
      .allInnerTexts(),
    lastMatch: await report.locator(".report").first().locator("p").innerText(),
  };
}

export async function expectCoherentReport(page: Page): Promise<void> {
  const report = await readReport(page);
  const last = report.lastMatch.replace(text.lastMatch, "").trim();
  expect(report.matches.length).toBeGreaterThanOrEqual(2);
  expect(report.matches.at(-1)).toContain(last);
  expect(Object.values(text.outcomes)).toContain(report.stage);
  const knockoutRounds = report.matches.filter((match) =>
    text.tournament.rounds.some((round) => match.startsWith(`${round}:`)),
  );
  const expectedRounds: Record<string, number> = {
    [text.outcomes.group]: 0,
    [text.outcomes.roundOf16]: 1,
    [text.outcomes.quarterfinal]: 2,
    [text.outcomes.semifinal]: 3,
    [text.outcomes.runnerUp]: 4,
    [text.outcomes.champion]: 4,
  };
  expect(knockoutRounds).toHaveLength(expectedRounds[report.stage]!);
}
