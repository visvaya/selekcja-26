import { expect, test } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
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
  squadCount,
  text,
  unfinishedOtherRulesSave,
  v4State,
} from "./helpers.ts";

test("a version 1 save is migrated without undo history", async ({ page }) => {
  const errors = collectPageErrors(page);
  const picked = players.slice(0, 10).map((player) => player.name);
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 1,
      state: {
        system: "433",
        priority: "form",
        stage: "camp",
        started: true,
        selected: picked,
        campSquad: [],
        trial: {},
        filter: "ALL",
        query: "",
        sort: "model",
        events: ["doctor"],
        effects: { chem: 0, fit: 4, quality: -1 },
        compare: [],
        seed: 12345,
        report: null,
      },
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(squadCount(page)).toHaveText("10/23");
  await expect(page.getByRole("main")).toContainText(text.systems["433"].name);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: text.undo })).toBeDisabled();

  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").schemaVersion,
        STORAGE_KEY,
      ),
    )
    .toBe(APP_CONFIG.saveSchemaVersion);
  const rewritten = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(rewritten.rulesRevision).toBe(RULES_REVISION);
  expect(rewritten.state.selected).toEqual(
    players.slice(0, 10).map((player) => player.id),
  );
  await page.reload();
  await expect(squadCount(page)).toHaveText("10/23");
  expect(errors).toEqual([]);
});

test("a version 2 save loads into the final stage and rewrites to the current version", async ({
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
        trial: {
          "Jakub Kiwior": { delta: 4, note: "impressed" },
          "Kamil Grosicki": { delta: -3, note: "disappointed" },
        },
        filter: "ALL",
        query: "",
        sort: "model",
        events: ["doctor", "captain", "scout"],
        effects: { chem: 0, fit: 4, quality: 1 },
        compare: ["Kamil Grosicki", "Jakub Kiwior"],
        seed: 4242,
        report: null,
        history: [
          {
            system: "3421",
            priority: "balance",
            stage: "camp",
            started: true,
            selected: ["Jakub Kiwior", "Kamil Grosicki"],
            campSquad: [],
            trial: {},
            filter: "ALL",
            query: "",
            sort: "model",
            events: ["doctor"],
            effects: { chem: 0, fit: 4, quality: -1 },
            compare: [],
            seed: 4000,
            report: null,
          },
          {
            system: "3421",
            priority: "balance",
            stage: "final",
            started: true,
            selected: ["Jakub Kiwior"],
            campSquad: ["Jakub Kiwior", "Kamil Grosicki"],
            trial: {
              "Jakub Kiwior": { delta: 4, note: "impressed" },
              "Kamil Grosicki": { delta: -3, note: "disappointed" },
            },
            filter: "ALL",
            query: "",
            sort: "model",
            events: ["doctor", "captain", "scout"],
            effects: { chem: 0, fit: 4, quality: 1 },
            compare: ["Kamil Grosicki"],
            seed: 4242,
            report: null,
          },
        ],
      },
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.stages.final.heading }),
  ).toBeVisible();
  await expect(squadCount(page)).toHaveText("2/26");
  await expect(page.getByRole("button", { name: text.undo })).toBeEnabled();

  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").schemaVersion,
        STORAGE_KEY,
      ),
    )
    .toBe(APP_CONFIG.saveSchemaVersion);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(saved.rulesRevision).toBe(RULES_REVISION);
  expect(saved.state.selected).toEqual(["jakub-kiwior", "pawel-wszolek"]);
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
    page.getByRole("heading", { name: text.introTitle }),
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

test("a finished version 3 report from other rules is shown frozen with the older-rules note", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(page, finishedOtherRulesReportSave());
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.outcomes.roundOf16 }),
  ).toBeVisible();
  await expect(page.getByText(text.reportFromOlderRules)).toBeVisible();
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
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a corrupt save starts a fresh game", async ({ page }) => {
  const errors = collectPageErrors(page);
  await seedStorage(page, "{not json");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
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
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
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
    page.getByRole("heading", { name: text.introTitle }),
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
    page.getByRole("heading", { name: text.introTitle }),
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
