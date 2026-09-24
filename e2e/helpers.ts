import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { APP_CONFIG, RULES_REVISION } from "../src/data/constants.ts";
import { UI_TEXT as text } from "../src/ui/text.ts";

export { text };

export const STORAGE_KEY = APP_CONFIG.storageKey;

export const CAMP_EVENT_CHOICES = [
  text.events.doctor.choices[0]!.title,
  text.events.captain.choices[0]!.title,
  text.events.scout.choices[0]!.title,
] as const;

// Seeds localStorage before the page's own scripts run, so the game boots directly from the
// given save. "seeded" guards against re-seeding on a reload within the same test.
export async function seedStorage(page: Page, value: string): Promise<void> {
  await page.addInitScript(
    ([key, raw]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key!, raw!);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [STORAGE_KEY, value],
  );
}

// A minimal version 3 save state, used as the base for the "other rules" scenarios below.
function v3Snapshot(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    system: "433",
    priority: "balance",
    stage: "camp",
    started: true,
    selected: ["robert-lewandowski"],
    campSquad: [],
    trial: {},
    filter: "ALL",
    query: "",
    sort: "model",
    events: [],
    effects: { chem: 0, fit: 0, quality: 0 },
    compare: [],
    seed: 111,
    report: null,
    ...overrides,
  };
}

// An unfinished version 3 save whose rulesRevision does not match the running build, so it gets
// discarded on load with the "rules changed" notice. Shared by the storage test and the axe scan.
export function unfinishedOtherRulesSave(): string {
  return JSON.stringify({
    schemaVersion: 3,
    rulesRevision: RULES_REVISION + 1,
    state: { ...v3Snapshot(), history: [] },
  });
}

const OLDER_RULES_SQUAD_IDS = [
  "lukasz-skorupski",
  "jakub-kiwior",
  "piotr-zielinski",
  "robert-lewandowski",
];

// A finished version 3 report from another rules revision, shown frozen with the older-rules
// note. Shared by the storage test and the axe scan.
export function finishedOtherRulesReportSave(): string {
  return JSON.stringify({
    schemaVersion: 3,
    rulesRevision: RULES_REVISION + 1,
    state: {
      ...v3Snapshot({
        stage: "final",
        report: {
          rulesRevision: RULES_REVISION + 1,
          squadIds: OLDER_RULES_SQUAD_IDS,
          quality: 80,
          chem: 78,
          coverage: 92,
          luck: 0,
          points: 5,
          stage: text.outcomes.roundOf16,
          grade: "B",
          strengths: [],
          weak: [],
          story: {
            matches: [`${text.tournament.rounds[0]}: 5 pkt`],
            outcome: "Polska odpadła w 1/8 finału.",
            last: "Polska 0:1 Dania",
            seed: 9,
          },
        },
      }),
      history: [],
    },
  });
}

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

export function squadCount(page: Page): Locator {
  return page.locator(".count-ring b");
}

export function finalizeButton(page: Page): Locator {
  return page.locator(".dock .finalize");
}

export function dockToggle(page: Page): Locator {
  return page.locator(".dock .dock-copy");
}

// Asserts the focus invariant that must hold after every screen transition: focus is never
// lost to the body (or nowhere at all), and the focused element's centre point is not covered
// by the sticky top bar/save banner or the fixed bottom dock, and is inside the viewport.
// Uses elementFromPoint on the element's own centre rather than bounding-box overlap, so an
// element that is merely adjacent to an overlay (not actually covered by it) still passes.
export async function expectFocusVisible(
  page: Page,
  state: string,
): Promise<void> {
  const result = await page.evaluate(() => {
    function describe(element: Element | null): string {
      if (!element) return "(none)";
      const tag = element.tagName.toLowerCase();
      const className =
        element instanceof HTMLElement && element.className
          ? `.${element.className.toString().trim().split(/\s+/).join(".")}`
          : "";
      const label = (element.textContent ?? "").trim().slice(0, 60);
      return `<${tag}${className}> "${label}"`;
    }
    const active = document.activeElement;
    if (!active || active === document.body)
      return {
        ok: false,
        message: "focus was lost (document.activeElement is body or null)",
      };
    const rect = active.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const inViewport =
      centerX >= 0 &&
      centerY >= 0 &&
      centerX <= window.innerWidth &&
      centerY <= window.innerHeight;
    if (!inViewport)
      return {
        ok: false,
        message: `focused element ${describe(active)} is outside the viewport (not scrolled into view)`,
      };
    const atCenter = document.elementFromPoint(centerX, centerY);
    const visible =
      atCenter !== null && (atCenter === active || active.contains(atCenter));
    if (!visible)
      return {
        ok: false,
        message: `focused element ${describe(active)} is covered by ${describe(atCenter)}`,
      };
    return { ok: true, message: "" };
  });
  expect(result.ok, `${state}: ${result.message}`).toBe(true);
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
