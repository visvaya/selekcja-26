import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  boardRegion,
  collectPageErrors,
  dockToggle,
  expectFocusVisible,
  finalizeButton,
  forceSaveErrorBanner,
  patchStorageFailures,
  saveBanner,
  STORAGE_KEY,
  text,
} from "./helpers.ts";

// These run in the phone projects and switch the viewport across the 1024 px breakpoint.
const DESKTOP = { width: 1280, height: 800 };
const TABLET = { width: 800, height: 800 };

async function startCamp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
}

// Exactly one board and one undo button at every width, and the side column is no landmark.
async function expectSingleBoard(page: Page, wide: boolean): Promise<void> {
  await expect(page.locator(".dock")).toHaveCount(1);
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(1);
  await expect(page.locator("main aside")).toHaveCount(0);
  if (wide) await expect(boardRegion(page)).toBeVisible();
  else await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
}

test("the board switches form across the breakpoint without duplicates", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize(DESKTOP);
  await startCamp(page);
  await expectSingleBoard(page, true);
  await page.setViewportSize(TABLET);
  await expectSingleBoard(page, false);
  await page.setViewportSize(DESKTOP);
  await expectSingleBoard(page, true);
  expect(errors).toEqual([]);
});

test("the side board fits under the save error banner and its stage button is reachable", async ({
  page,
}) => {
  await patchStorageFailures(page, STORAGE_KEY);
  await page.setViewportSize(DESKTOP);
  await startCamp(page);
  await forceSaveErrorBanner(page);
  await expect(saveBanner(page)).toBeVisible();

  // Scrolled down the list, so the side column is stuck under the bar and the banner.
  await page.evaluate(() => window.scrollTo(0, 1500));
  // Measured as one snapshot and polled: the banner's height (and so --save-banner-offset)
  // can still settle after the fonts load, and both sticky elements must follow it.
  await page.evaluate(() => document.fonts.ready);
  const layout = () =>
    page.evaluate(() => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        boardTop: rect(".dock-side").top,
        boardBottom: rect(".dock-side").bottom,
        topbarBottom: rect(".topbar").bottom,
        viewportHeight: window.innerHeight,
      };
    });
  await expect
    .poll(async () => {
      const box = await layout();
      return box.boardTop >= box.topbarBottom;
    })
    .toBe(true);
  await expect
    .poll(async () => {
      const box = await layout();
      return box.boardBottom <= box.viewportHeight;
    })
    .toBe(true);

  // The stage button sits at the top of the scrolling board; keyboard focus brings it back.
  await boardRegion(page).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await finalizeButton(page).focus();
  await expect(finalizeButton(page)).toBeInViewport();
  await expectFocusVisible(page, "stage button after the board scrolled");
});
