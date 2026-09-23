import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
import { APP_CONFIG, RULES_REVISION } from "../src/data/constants.ts";
import {
  STORAGE_KEY,
  collectPageErrors,
  dialog,
  expectSavedSchemaVersion,
  patchStorageFailures,
  saveAlert,
  saveBanner,
  saveStatusRegion,
  setStorageFailureMode,
  squadCount,
  text,
} from "./helpers.ts";

async function seedStorage(page: Page, value: string): Promise<void> {
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
  await expect(page.locator(".game-head .eyebrow")).toContainText(
    text.systems["433"].name,
  );
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

test("a version 2 save loads into the final stage and rewrites to version 3", async ({
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
    .toBe(3);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    STORAGE_KEY,
  );
  expect(saved.rulesRevision).toBe(RULES_REVISION);
  expect(saved.state.selected).toEqual(["jakub-kiwior", "pawel-wszolek"]);
  expect(errors).toEqual([]);
});

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

test("an unfinished version 3 save from other rules is discarded with a notice", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 3,
      rulesRevision: RULES_REVISION + 1,
      state: { ...v3Snapshot(), history: [] },
    }),
  );
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
  const squadIds = [
    "lukasz-skorupski",
    "jakub-kiwior",
    "piotr-zielinski",
    "robert-lewandowski",
  ];
  await seedStorage(
    page,
    JSON.stringify({
      schemaVersion: 3,
      rulesRevision: RULES_REVISION + 1,
      state: {
        ...v3Snapshot({
          stage: "final",
          report: {
            rulesRevision: RULES_REVISION + 1,
            squadIds,
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
    }),
  );
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.outcomes.roundOf16 }),
  ).toBeVisible();
  await expect(page.locator(".fineprint").first()).toContainText(
    text.reportFromOlderRules,
  );
  await expect(page.getByRole("button", { name: text.undo })).toBeDisabled();
  for (const name of [
    "Łukasz Skorupski",
    "Jakub Kiwior",
    "Piotr Zieliński",
    "Robert Lewandowski",
  ]) {
    await expect(page.locator(".squad-pill", { hasText: name })).toHaveCount(1);
  }

  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.outcomes.roundOf16 }),
  ).toBeVisible();
  await expect(page.locator(".fineprint").first()).toContainText(
    text.reportFromOlderRules,
  );

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

  await expectSavedSchemaVersion(page, 3);

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
