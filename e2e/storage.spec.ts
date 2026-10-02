import { expect, test } from "@playwright/test";
import { APP_CONFIG, RULES_REVISION } from "../src/data/constants.ts";
import {
  STORAGE_KEY,
  collectPageErrors,
  dialog,
  expectSavedSchemaVersion,
  finishedOtherRulesReportSave,
  patchStorageFailures,
  saveAlert,
  saveBanner,
  saveStatusRegion,
  seedStorage,
  setStorageFailureMode,
  text,
  unfinishedOtherRulesSave,
  v4State,
} from "./helpers.ts";

// Version 1 and 2 saves were written under rules revision 1: a finished report survives the
// migration frozen (letter grade shown on the 1-6 scale), an unfinished game is discarded.
test("a version 1 save with a finished report is migrated and shown frozen", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 1,
      state: {
        system: "433",
        priority: "form",
        stage: "final",
        started: true,
        selected: ["Łukasz Skorupski", "Robert Lewandowski"],
        campSquad: ["Łukasz Skorupski"],
        trial: {},
        filter: "ALL",
        query: "",
        sort: "model",
        events: ["doctor", "captain", "scout"],
        effects: { chem: 5, fit: 4, quality: -2 },
        compare: [],
        seed: 77,
        report: {
          s: [
            {
              name: "Łukasz Skorupski",
              pos: "BR",
              club: "Bologna",
              ov: 83,
              form: 80,
              fit: 91,
              tact: 79,
              chem: 82,
              roles: [],
              age: 35,
              flags: "",
            },
            {
              name: "Robert Lewandowski",
              pos: "ATA",
              club: "FC Barcelona",
              ov: 88,
              form: 82,
              fit: 76,
              tact: 91,
              chem: 94,
              roles: [],
              age: 39,
              flags: "",
            },
          ],
          quality: 84,
          chem: 80,
          coverage: 100,
          luck: 0,
          points: 5,
          stage: text.outcomes.quarterfinal,
          grade: "B+",
          strengths: [],
          weak: [],
          story: {
            matches: ["Faza grupowa: 5 pkt"],
            last: "Polska 0:1 Dania",
            outcome: "Polska odpadła w ćwierćfinale.",
            seed: 9,
          },
        },
      },
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.outcomes.quarterfinal }),
  ).toBeVisible();
  await expect(page.getByText(text.reportFromOlderRules)).toBeVisible();
  await expect(page.locator(".grade")).toHaveText("4+");
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(0);
  await expectSavedSchemaVersion(page, APP_CONFIG.saveSchemaVersion);
  const rewritten = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(rewritten.rulesRevision).toBe(RULES_REVISION);
  expect(rewritten.state.report.rulesRevision).toBe(1);
  expect(rewritten.state.report.squadIds).toEqual([
    "lukasz-skorupski",
    "robert-lewandowski",
  ]);
  expect(errors).toEqual([]);
});

test("an unfinished version 2 save is discarded with the rules notice", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 2,
      state: {
        system: "3421",
        priority: "balance",
        stage: "final",
        started: true,
        selected: ["Jakub Kiwior", "Paweł Wszołek"],
        campSquad: ["Jakub Kiwior", "Kamil Grosicki"],
        trial: {},
        filter: "ALL",
        query: "",
        sort: "model",
        events: ["doctor", "captain", "scout"],
        effects: { chem: 0, fit: 4, quality: 1 },
        compare: [],
        seed: 4242,
        report: null,
        history: [],
      },
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.rulesChangedTitle }),
  ).toBeVisible();
  await expect(dialog(page)).toContainText(text.rulesChangedDiscarded);
  expect(errors).toEqual([]);
});

test("an unfinished version 3 save from other rules is discarded with a notice", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(page, unfinishedOtherRulesSave());
  await page.goto("/");

  await expect(dialog(page)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: text.rulesChangedTitle }),
  ).toBeVisible();
  await expect(dialog(page)).toContainText(text.rulesChangedDiscarded);
  await page.getByRole("button", { name: text.understood }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").rulesRevision,
        STORAGE_KEY,
      ),
    )
    .toBe(RULES_REVISION);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(saved.state.selected).toEqual([]);
  expect(errors).toEqual([]);
});

test("a finished report from other rules is shown frozen with the older-rules note", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(page, finishedOtherRulesReportSave());
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.outcomes.roundOf16 }),
  ).toBeVisible();
  await expect(page.getByText(text.reportFromOlderRules)).toBeVisible();
  // The stored letter grade "B" is shown on the 1-6 scale.
  await expect(page.locator(".grade")).toHaveText("4");
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(0);
  for (const name of [
    "Łukasz Skorupski",
    "Jakub Kiwior",
    "Piotr Zieliński",
    "Robert Lewandowski",
  ]) {
    await expect(page.getByText(name).filter({ visible: true })).toHaveCount(1);
  }

  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.outcomes.roundOf16 }),
  ).toBeVisible();
  await expect(page.getByText(text.reportFromOlderRules)).toBeVisible();

  await page.getByRole("button", { name: text.restart }).click();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a corrupt save starts a fresh game", async ({ page }) => {
  const errors = collectPageErrors(page);
  await seedStorage(page, "{not json");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("?reset discards the saved game and removes the parameter", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).click();
  await page.getByRole("button", { name: text.autoFill }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/?reset");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a quota-exceeded save shows a retry banner and recovers", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await patchStorageFailures(page, STORAGE_KEY);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();

  await setStorageFailureMode(page, "quota");
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();

  await expect(saveAlert(page)).toHaveText(text.save.messages.quota);
  await expect(
    saveBanner(page).getByRole("button", { name: text.save.retry }),
  ).not.toBeFocused();

  await setStorageFailureMode(page, "none");
  await saveBanner(page).getByRole("button", { name: text.save.retry }).click();
  await expect(saveAlert(page)).toHaveText("");
  await expect(saveStatusRegion(page)).toHaveText(text.save.recovered);

  await expectSavedSchemaVersion(page, APP_CONFIG.saveSchemaVersion);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a generic save failure recovers after a later action without retry", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await patchStorageFailures(page, STORAGE_KEY);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();

  await setStorageFailureMode(page, "failed");
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(saveAlert(page)).toHaveText(text.save.messages.failed);

  await setStorageFailureMode(page, "none");
  await page.getByRole("button", { name: text.autoFill }).click();
  await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
  await dialog(page)
    .getByRole("button", { name: text.events.doctor.choices[0]!.title })
    .click();

  await expect(saveAlert(page)).toHaveText("");
  await expect(saveStatusRegion(page)).toHaveText(text.save.recovered);
  expect(errors).toEqual([]);
});

test("unavailable storage shows a dismissible banner and keeps the game playable", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await patchStorageFailures(page, STORAGE_KEY, "unavailable");
  await page.goto("/");

  await expect(saveAlert(page)).toHaveText(text.save.messages.unavailable);
  await saveBanner(page).getByRole("button", { name: text.understood }).click();
  await expect(saveAlert(page)).toHaveText("");

  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(saveAlert(page)).toHaveText("");

  await page.getByRole("button", { name: text.autoFill }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(saveAlert(page)).toHaveText("");
  expect(errors).toEqual([]);
});

test("a version 4 save restores the list position filter and search", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 4,
      rulesRevision: RULES_REVISION,
      state: v4State({ positions: ["LŚO"], query: "ki" }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.positions["LŚO"] }),
  ).toBeVisible();
  await expect(page.getByLabel(text.searchLabel)).toHaveValue("ki");
  await expect(page.getByRole("button", { name: /^LŚO \(/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

// Filters live outside the undo history and in the save: a filtered list survives a squad
// change, its undo and a reload with the same criteria, players and panel badge.
test("list filters survive a squad change, undo and reload", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();

  await page.getByRole("button", { name: /^N \(/ }).click();
  await page.getByRole("button", { name: /^LS \(/ }).click();
  await page.getByLabel(text.searchLabel).fill("a");
  const toggle = page.locator(".filters-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("checkbox", { name: text.roles.pace }).check();
  const ageFrom = page.getByRole("spinbutton", {
    name: text.rangeFrom(text.ranges.age),
  });
  await ageFrom.fill("21");
  await ageFrom.press("Enter");
  await expect(ageFrom).toHaveValue("21");
  await expect(toggle).toHaveAccessibleName(text.detailFiltersActive(2));

  const profiles = page.locator(".player .profile-btn");
  const callUp = page.locator(".player .select-btn");
  await expect(profiles.nth(2)).toBeVisible();
  await callUp.nth(0).click();
  await callUp.nth(1).click();
  const count = page.locator(".list-count");
  const filteredCount = await count.innerText();
  // A call-up and its undo leave the filters and the visible list alone.
  await callUp.nth(2).click();
  await expect(
    page.getByRole("checkbox", { name: text.onlySelected(3) }),
  ).toBeVisible();
  await page.getByRole("button", { name: text.undo }).click();
  await expect(
    page.getByRole("checkbox", { name: text.onlySelected(2) }),
  ).toBeVisible();
  await expect(count).toHaveText(filteredCount);
  await expect(page.getByLabel(text.searchLabel)).toHaveValue("a");
  await expect(toggle).toHaveAccessibleName(text.detailFiltersActive(2));
  await page.getByRole("checkbox", { name: text.onlySelected(2) }).check();
  await expect(profiles).toHaveCount(2);

  // A squad change and its undo leave the filters alone.
  await callUp.nth(0).click();
  await expect(profiles).toHaveCount(1);
  await page.getByRole("button", { name: text.undo }).click();
  await expect(profiles).toHaveCount(2);

  const names = () =>
    profiles.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
  const before = { names: await names(), count: await count.innerText() };
  expect(before.count).toBe(text.visibleCount(2, 61));

  await page.reload();
  await expect(count).toHaveText(before.count);
  expect(await names()).toEqual(before.names);
  await expect(page.getByLabel(text.searchLabel)).toHaveValue("a");
  for (const code of ["N", "LS"])
    await expect(
      page.getByRole("button", { name: new RegExp(`^${code} \\(`) }),
    ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("checkbox", { name: text.onlySelected(2) }),
  ).toBeChecked();
  await expect(toggle).toHaveAccessibleName(text.detailFiltersActive(2));
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(
    page.getByRole("checkbox", { name: text.roles.pace }),
  ).toBeChecked();
  await expect(
    page.locator(".filters-panel input[type=checkbox]:checked"),
  ).toHaveCount(1);
  await expect(ageFrom).toHaveValue("21");
  await expect(
    page.getByRole("spinbutton", { name: text.rangeTo(text.ranges.age) }),
  ).toHaveValue("");
  expect(errors).toEqual([]);
});
