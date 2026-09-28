import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
import { RULES_REVISION } from "../src/data/constants.ts";
import {
  campSave,
  dialog,
  dockToggle,
  finishedReportSave,
  seedStorage,
  text,
} from "./helpers.ts";

// Baselines of the current look, compared in CI only (Linux). They guard stages that must not
// change the look and are re-baselined, with the reason, by stages that do.
const SIZES = [
  { name: "phone", width: 360, height: 740 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const firstIds = (count: number) =>
  players.slice(0, count).map((player) => player.id);

async function shot(page: Page, name: string, fullPage = false) {
  // Park the pointer so no :hover state of the last-clicked button is captured.
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    animations: "disabled",
    caret: "hide",
    mask: [page.locator(".topbar-version")],
  });
}

for (const size of SIZES) {
  test.describe(`${size.name} ${size.width}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test("start screen", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await shot(page, `${size.name}-start`, true);
    });

    test("camp list", async ({ page }) => {
      await seedStorage(
        page,
        campSave({ selectedIds: firstIds(10), events: ["doctor"] }),
      );
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: text.stages.camp.heading }),
      ).toBeVisible();
      await shot(page, `${size.name}-camp-list`);
    });

    test("board expanded", async ({ page }) => {
      await seedStorage(
        page,
        campSave({ selectedIds: firstIds(10), events: ["doctor"] }),
      );
      await page.goto("/");
      await dockToggle(page).click();
      await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
      await shot(page, `${size.name}-board`);
    });

    test("profile dialog", async ({ page }) => {
      await seedStorage(
        page,
        campSave({ selectedIds: firstIds(10), events: ["doctor"] }),
      );
      await page.goto("/");
      await page.getByRole("button", { name: text.profile }).first().click();
      await expect(dialog(page)).toBeVisible();
      await shot(page, `${size.name}-profile`);
    });

    test("comparison dialog", async ({ page }) => {
      await seedStorage(
        page,
        campSave({ selectedIds: firstIds(10), events: ["doctor"] }),
      );
      await page.goto("/");
      const compare = page.locator(".compare-btn");
      await compare.nth(0).click();
      await compare.nth(1).click();
      await expect(dialog(page)).toHaveAccessibleName(text.comparisonTitle);
      await shot(page, `${size.name}-comparison`);
    });

    test("event dialog", async ({ page }) => {
      await seedStorage(
        page,
        campSave({ selectedIds: firstIds(9), events: [] }),
      );
      await page.goto("/");
      await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
      await shot(page, `${size.name}-event`);
    });

    test("tournament report", async ({ page }) => {
      await seedStorage(page, finishedReportSave(RULES_REVISION));
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: text.outcomes.roundOf16 }),
      ).toBeVisible();
      await shot(page, `${size.name}-report`, true);
    });
  });
}
