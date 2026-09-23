import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
import { APP_CONFIG } from "../src/data/constants.ts";
import { STORAGE_KEY, collectPageErrors, squadCount, text } from "./helpers.ts";

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
  await page.reload();
  await expect(squadCount(page)).toHaveText("10/23");
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
