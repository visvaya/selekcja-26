import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  boardRegion,
  closeBoard,
  collectPageErrors,
  dockToggle,
  expectFocusVisible,
  finalizeButton,
  forceSaveErrorBanner,
  openBoard,
  patchStorageFailures,
  saveBanner,
  STORAGE_KEY,
  text,
} from "./helpers.ts";

// These run in the phone projects and switch the viewport across the 1024 px breakpoint.
const DESKTOP = { width: 1280, height: 800 };
const TABLET = { width: 800, height: 800 };
const NARROW = { width: 400, height: 800 };
const PORTRAIT = { width: 360, height: 740 };
const LANDSCAPE = { width: 740, height: 360 };

async function startCamp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
}

// Exactly one board and one set of actions at every width, and the side column is no landmark.
// Below 1024 px the actions live in the sheet, so they are counted with the sheet open.
async function expectSingleBoard(page: Page, wide: boolean): Promise<void> {
  await expect(page.locator(".dock")).toHaveCount(1);
  await expect(page.locator("main aside")).toHaveCount(0);
  if (wide) {
    await expect(boardRegion(page)).toBeVisible();
    await expect(page.getByRole("button", { name: text.undo })).toHaveCount(1);
    return;
  }
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
  await openBoard(page);
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(1);
  await closeBoard(page);
}

// No part of the page is left inert and the page scroll is not left locked.
async function expectPageLive(page: Page): Promise<void> {
  await expect(page.locator("[inert]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/is-sheet-open/);
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

test("an open sheet survives resizing across the breakpoint and rotating", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.setViewportSize(NARROW);
  await startCamp(page);
  await openBoard(page);
  await expect(page.locator(".phone-dock .phone-dock-handle")).toBeFocused();

  // Focus was in the sheet, so it moves to the side board region, and the page is live.
  await page.setViewportSize(DESKTOP);
  await expect(boardRegion(page)).toBeVisible();
  await expect(page.locator(".dock")).toHaveCount(1);
  await expectPageLive(page);
  await expect(boardRegion(page)).toBeFocused();

  // Back below 1024 px: the bar comes back closed, with focus on its toggle.
  await page.setViewportSize(NARROW);
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(dockToggle(page)).toBeFocused();
  await expectPageLive(page);

  // Rotating with the sheet open keeps it open in the landscape layout.
  await page.setViewportSize(PORTRAIT);
  await openBoard(page);
  await page.setViewportSize(LANDSCAPE);
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".phone-dock")).toHaveAttribute("role", "dialog");
  await expect
    .poll(() =>
      page
        .locator(".phone-dock-body")
        .evaluate(
          (body) =>
            getComputedStyle(body).gridTemplateColumns.trim().split(" ").length,
        ),
    )
    .toBe(2);
  const rows = await page.evaluate(() => {
    const top = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect().top;
    const bottom = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect().bottom;
    return {
      finalizeTop: top(".phone-dock-bar .finalize"),
      toggleBottom: bottom(".phone-dock-bar .phone-dock-toggle"),
    };
  });
  // The stage button shares the bar row with the toggle instead of a row below it.
  expect(rows.finalizeTop).toBeLessThan(rows.toggleBottom);
  expect(errors).toEqual([]);
});
