import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
import { APP_CONFIG, RULES_REVISION } from "../src/data/constants.ts";
import type { GroupPosition } from "../src/data/types.ts";
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

// The IDs of the first `count` candidates of a position group, in catalog order.
export const idsInGroup = (group: GroupPosition, count: number) =>
  players
    .filter((player) => player.pos === group)
    .slice(0, count)
    .map((player) => player.id);

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

// A minimal unfinished version 4 save state for the running rules, with list settings that
// default to an unfiltered list unless overridden.
export function v4State(
  list: Record<string, unknown> = {},
): Record<string, unknown> {
  const {
    filter: _filter,
    query: _query,
    sort: _sort,
    ...snapshot
  } = v3Snapshot();
  return {
    ...snapshot,
    list: {
      positions: [],
      query: "",
      sort: "model",
      foot: { left: false, right: false },
      traits: [],
      ranges: {},
      onlySelected: false,
      onlyCamp: false,
      ...list,
    },
    history: [],
  };
}

const LEGACY_RULES_REVISION = 1;

// An unfinished version 3 save written under rules revision 1, so it gets discarded on load
// with the "rules changed" notice. Shared by the storage test and the axe scan.
export function unfinishedOtherRulesSave(): string {
  return JSON.stringify({
    schemaVersion: 3,
    rulesRevision: LEGACY_RULES_REVISION,
    state: { ...v3Snapshot(), history: [] },
  });
}

const OLDER_RULES_SQUAD_IDS = [
  "lukasz-skorupski",
  "jakub-kiwior",
  "piotr-zielinski",
  "robert-lewandowski",
];

// Rules revision 1 stored letter grades; later revisions grade on the 1-6 scale.
function finishedReport(rulesRevision: number, story: unknown) {
  return {
    rulesRevision,
    squadIds: OLDER_RULES_SQUAD_IDS,
    quality: 80,
    chem: 78,
    coverage: 92,
    luck: 0,
    points: 5,
    stage: text.outcomes.roundOf16,
    grade: rulesRevision === LEGACY_RULES_REVISION ? "B" : "4",
    strengths: [],
    weak: [],
    story,
  };
}

// A finished round of 16 report for the given rules revision, shown frozen with the older-rules
// note when that revision differs from the running one. Rules revision 1 wrote a version 3 save
// with the flat legacy story; any later revision gets a version 4 save with a structured story.
// Shared by the storage test, the axe scan and the visual baselines.
export function finishedReportSave(rulesRevision: number): string {
  if (rulesRevision === LEGACY_RULES_REVISION)
    return JSON.stringify({
      schemaVersion: 3,
      rulesRevision,
      state: {
        ...v3Snapshot({
          stage: "final",
          report: finishedReport(rulesRevision, {
            matches: ["Faza grupowa: 5 pkt", "1/8 finału: Polska 0:1 Dania"],
            outcome: "Polska odpadła w 1/8 finału.",
            last: "Polska 0:1 Dania",
            seed: 9,
          }),
        }),
        history: [],
      },
    });
  const goals = (goalsFor: number, goalsAgainst: number) => ({
    goalsFor,
    goalsAgainst,
    penalties: null,
  });
  return JSON.stringify({
    schemaVersion: 4,
    rulesRevision,
    state: {
      ...v4State(),
      stage: "final",
      report: finishedReport(rulesRevision, {
        groupPoints: 5,
        groupMatches: [
          { ...goals(1, 1), opponent: "Szwajcaria" },
          { ...goals(2, 0), opponent: "Serbia" },
          { ...goals(0, 0), opponent: "Austria" },
        ],
        knockout: [{ ...goals(0, 1), round: "roundOf16", opponent: "Dania" }],
        outcome: "Polska odpadła w 1/8 finału.",
        seed: 9,
      }),
    },
  });
}

// A finished report from the older rules revision 1, shown frozen with the older-rules note
// and its letter grade mapped onto the 1-6 scale. Shared by the storage test and the axe scan.
export function finishedOtherRulesReportSave(): string {
  return finishedReportSave(LEGACY_RULES_REVISION);
}

// An unfinished camp-stage save for the running rules, used by the screenshot baselines.
export function campSave({
  selectedIds,
  events,
  system = "433",
}: {
  selectedIds: string[];
  events: string[];
  system?: string;
}): string {
  return JSON.stringify({
    schemaVersion: 4,
    rulesRevision: RULES_REVISION,
    state: {
      ...v4State(),
      system,
      selected: selectedIds,
      events,
      seed: 12345,
    },
  });
}

// An unfinished final-stage save for the running rules; the camp squad is the given selection.
export function finalSave({
  selectedIds,
  system = "4231",
}: {
  selectedIds: string[];
  system?: string;
}): string {
  return JSON.stringify({
    schemaVersion: 4,
    rulesRevision: RULES_REVISION,
    state: {
      ...v4State(),
      stage: "final",
      system,
      selected: selectedIds,
      campSquad: selectedIds,
      events: ["doctor", "captain", "scout"],
      seed: 12345,
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

// The game dialogs; the open phone board sheet is also a dialog and is excluded.
export function dialog(page: Page): Locator {
  return page.locator('[role="dialog"]:not(.phone-dock)');
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
  return page.locator(".phone-dock .phone-dock-toggle");
}

// Opens the phone board sheet with a tap (or a click without touch) on the bar toggle.
// From 1024 px there is no sheet (the actions sit in the side column), so it does nothing.
export async function openBoard(page: Page): Promise<void> {
  if ((await page.locator(".phone-dock").count()) === 0) return;
  const toggle = dockToggle(page);
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await tapOrClick(page, toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

// Closes the phone board sheet through its handle; nothing to do from 1024 px.
export async function closeBoard(page: Page): Promise<void> {
  if ((await page.locator(".phone-dock").count()) === 0) return;
  const toggle = dockToggle(page);
  if ((await toggle.getAttribute("aria-expanded")) === "true")
    await tapOrClick(page, page.locator(".phone-dock .phone-dock-handle"));
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
}

async function tapOrClick(page: Page, target: Locator): Promise<void> {
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touch) await target.tap();
  else await target.click();
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

// The tournament path: the group's nested match lines, then the knockout rounds (the top-level
// lines after the group line).
export async function readReport(page: Page) {
  const report = page.locator(".result");
  const path = report.locator(".report").first().locator(":scope > ul");
  return {
    stage: await report.locator("h1").innerText(),
    grade: await report.locator(".grade").innerText(),
    groupMatches: await path
      .locator(":scope > li")
      .first()
      .locator("ul > li")
      .allInnerTexts(),
    knockout: (await path.locator(":scope > li").allInnerTexts()).slice(1),
  };
}

export async function expectCoherentReport(page: Page): Promise<void> {
  const report = await readReport(page);
  const t = text.tournament;
  expect(Object.values(text.outcomes)).toContain(report.stage);
  expect(report.groupMatches).toHaveLength(3);
  for (const match of report.groupMatches)
    expect(match).toMatch(/Polska \d+:\d+/);
  const expectedRounds: Record<string, number> = {
    [text.outcomes.group]: 0,
    [text.outcomes.roundOf16]: 1,
    [text.outcomes.quarterfinal]: 2,
    [text.outcomes.semifinal]: 3,
    [text.outcomes.runnerUp]: 4,
    [text.outcomes.champion]: 4,
  };
  expect(report.knockout).toHaveLength(expectedRounds[report.stage]!);
  const lines = [...report.groupMatches, ...report.knockout];
  const count = (marker: string) =>
    lines.filter((line) => line.includes(marker)).length;
  const finalRow = report.knockout.at(-1) ?? "";
  if (report.stage === text.outcomes.semifinal) {
    expect(count(t.semifinalLossMarker)).toBe(1);
    expect(count(t.eliminatedMarker)).toBe(0);
    expect(finalRow).toContain(t.semifinalLossMarker);
  } else if (
    report.stage === text.outcomes.champion ||
    report.stage === text.outcomes.runnerUp
  ) {
    expect(count(t.eliminatedMarker)).toBe(0);
    expect(count(t.semifinalLossMarker)).toBe(0);
    expect(finalRow.startsWith(`${t.roundNames.final}:`)).toBe(true);
    expect(finalRow).toContain(
      t.placeMarker(report.stage === text.outcomes.champion ? 1 : 2),
    );
  } else {
    expect(count(t.eliminatedMarker)).toBe(1);
    expect(count(t.semifinalLossMarker)).toBe(0);
    expect(lines.at(-1)).toContain(t.eliminatedMarker);
  }
}

// The desktop side board (from 1024 px): a focusable region named after the stage.
export function boardRegion(page: Page): Locator {
  return page.getByRole("region", {
    name: new RegExp(`^${text.boardRegion.camp.split(" – ")[0]}`),
  });
}

// Shows the save error banner by failing the next save, a call-up of the first candidate. The
// page must have been prepared with patchStorageFailures before it loaded.
export async function forceSaveErrorBanner(page: Page): Promise<void> {
  await setStorageFailureMode(page, "failed");
  await page.locator(".select-btn").first().click();
  await expect(saveAlert(page)).toHaveText(text.save.messages.failed);
}
