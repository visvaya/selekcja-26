import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import {
  CAMP_EVENT_CHOICES,
  campSave,
  collectPageErrors,
  dialog,
  dockToggle,
  expectFocusVisible,
  finalizeButton,
  forceSaveErrorBanner,
  idsInGroup,
  openBoard,
  patchStorageFailures,
  saveBanner,
  seedStorage,
  squadCount,
  STORAGE_KEY,
  text,
} from "./helpers.ts";

// The phone board sheet below 1024 px: dialogs above it, its gestures, its Escape order and the
// bar that hides while the page scrolls. Runs in the phone and phone-webkit projects.

const MOTION = { contextOptions: { reducedMotion: "no-preference" as const } };

function sheet(page: Page): Locator {
  return page.getByRole("dialog", { name: text.sheetTitle });
}

function handle(page: Page): Locator {
  return page.locator(".phone-dock .phone-dock-handle");
}

function dock(page: Page): Locator {
  return page.locator(".phone-dock");
}

async function startCamp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).tap();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
}

async function isInert(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element.closest("[inert]") !== null);
}

async function isFocused(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element === document.activeElement);
}

// Fills the camp with the sheet's random fill and settles the three camp events on the way.
// Each event dialog sits above the open sheet and works; Escape leaves both open. The fill
// completes the squad, so "Dobierz losowo" is disabled when a dialog closes and focus falls back
// to the sheet's handle (never to the inert page under the sheet).
async function fillCampThroughEvents(page: Page): Promise<void> {
  const autoFill = sheet(page).getByRole("button", { name: text.autoFill });
  await autoFill.tap();
  for (const choice of CAMP_EVENT_CHOICES) {
    await expect(dialog(page)).toBeVisible();
    expect(await isInert(dialog(page)), "event dialog inert").toBe(false);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeVisible();
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await dialog(page)
      .getByRole("button", { name: new RegExp(choice) })
      .tap();
    // Focus is in the next event's dialog or back inside the sheet.
    await expect
      .poll(() =>
        page.evaluate((label) => {
          const active = document.activeElement;
          if (active?.closest('[role="dialog"]:not(.phone-dock)'))
            return "event dialog";
          if (active?.classList.contains("phone-dock-handle"))
            return "sheet handle";
          if (active?.closest(".phone-dock") && active.textContent === label)
            return "random fill";
          return `<${active?.tagName}> "${active?.textContent?.slice(0, 40)}"`;
        }, text.autoFill),
      )
      .toMatch(/^(event dialog|sheet handle|random fill)$/);
  }
  await expect(dialog(page)).toBeHidden();
  await expect(squadCount(page).first()).toHaveText("23/23");
  await expect(sheet(page)).toBeVisible();
  await expect(autoFill).toBeDisabled();
  await expect(handle(page)).toBeFocused();
}

async function expectPageLive(page: Page): Promise<void> {
  await expect(page.locator("[inert]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/is-sheet-open/);
}

test("a dialog opened from the open sheet sits above it, and leaving the stage closes the sheet", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await startCamp(page);
  await openBoard(page);
  await fillCampThroughEvents(page);

  // "Nowa gra" asks first; confirming closes the sheet and frees the page.
  await sheet(page).getByRole("button", { name: text.newGame }).tap();
  await expect(dialog(page)).toHaveAccessibleName(text.confirmNewGame.title);
  await dialog(page)
    .getByRole("button", { name: text.confirmNewGame.confirm })
    .tap();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeFocused();
  await expect(dock(page)).toHaveCount(0);
  await expectPageLive(page);

  // The stage button in the bar of the open sheet finishes the camp.
  await page.getByRole("button", { name: text.start }).tap();
  await openBoard(page);
  await fillCampThroughEvents(page);
  await page.locator(".phone-dock-bar .finalize").tap();
  await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() =>
      dialog(page).evaluate((element) =>
        element.contains(document.activeElement),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test.describe("drag on the handle", () => {
  test.use(MOTION);

  // Synthetic pointer events on the handle, dispatched in the page with measured gaps between
  // them: page.touchscreen sends taps only, and one Playwright dispatchEvent round trip takes
  // about 120 ms on a slow machine, too slow for a 20 ms flick. The gaps spin on the clock
  // instead of a timer, which a loaded machine can stretch past the flick speed.
  async function drag(
    page: Page,
    distance: number,
    steps: number,
    gapMs: number,
  ): Promise<void> {
    await handle(page).evaluate(
      (element, { dy, count, gap }) => {
        const rect = element.getBoundingClientRect();
        const startY = rect.top + rect.height / 2;
        const fire = (type: string, clientY: number) =>
          element.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 1,
              pointerType: "touch",
              isPrimary: true,
              clientY,
              bubbles: true,
              cancelable: true,
              composed: true,
            }),
          );
        const wait = () => {
          const until = performance.now() + gap;
          while (performance.now() < until);
        };
        fire("pointerdown", startY);
        for (let step = 1; step <= count; step++) {
          wait();
          fire("pointermove", startY + (dy * step) / count);
        }
        fire("pointerup", startY + dy);
      },
      { dy: distance, count: steps, gap: gapMs },
    );
  }

  async function sheetTransform(page: Page): Promise<string> {
    return page
      .locator(".phone-dock-more")
      .evaluate((element) => (element as HTMLElement).style.transform);
  }

  test.beforeEach(async ({ page, hasTouch }) => {
    test.skip(
      !hasTouch,
      "drag to close is a touch gesture; this project emulates no touch",
    );
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
    await page.goto("/");
    await openBoard(page);
    await expect(handle(page)).toBeFocused();
  });

  test("a short slow drag springs back and its click does not close", async ({
    page,
  }) => {
    // 40 px over about 400 ms: neither far nor fast.
    await drag(page, 40, 20, 20);
    await handle(page).dispatchEvent("click");
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => sheetTransform(page)).toBe("");
    await expect(sheet(page)).toBeVisible();
  });

  test("a fast flick closes and returns focus to the toggle", async ({
    page,
  }) => {
    // 30 px in about 20 ms.
    await drag(page, 30, 2, 10);
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(dockToggle(page)).toBeFocused();
    await expect(page.locator(".phone-dock-more")).toBeHidden();
  });

  test("a long drag closes and returns focus to the toggle", async ({
    page,
  }) => {
    const height = await page
      .locator(".phone-dock-more")
      .evaluate((element) => (element as HTMLElement).offsetHeight);
    const far = Math.min(160, height * 0.3) + 20;
    // Slow enough not to count as a flick.
    await drag(page, far, 20, 20);
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(dockToggle(page)).toBeFocused();
  });

  test("toggling twice during the slide reopens from the current position", async ({
    page,
  }) => {
    // The second tap follows as soon as React has committed the first: a frame on a loaded
    // machine can outlast the whole slide.
    const midSlide = await dockToggle(page).evaluate(async (toggle) => {
      (toggle as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const more = document.querySelector<HTMLElement>(".phone-dock-more")!;
      const transform = more.style.transform;
      const hidden = more.hidden;
      (toggle as HTMLElement).click();
      return { transform, hidden };
    });
    // The first toggle started the closing slide, the second caught it on the way.
    expect(midSlide.hidden).toBe(false);
    expect(midSlide.transform).not.toBe("");
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".phone-dock-more")).toBeVisible();
    await expect.poll(() => sheetTransform(page)).toBe("");
  });
});

test("the sheet closes an open position popover and Escape then closes the sheet above the save banner", async ({
  page,
  browserName,
}) => {
  const errors = collectPageErrors(page);
  await patchStorageFailures(page, STORAGE_KEY);
  await startCamp(page);
  await forceSaveErrorBanner(page);
  const retry = saveBanner(page).getByRole("button", {
    name: text.save.retry,
  });
  await expect(retry).toBeVisible();

  const openPopovers = () =>
    page.evaluate(() => document.querySelectorAll(":popover-open").length);
  await page.locator(".player .pos").first().tap();
  await expect.poll(openPopovers).toBe(1);

  await openBoard(page);
  await expect.poll(openPopovers).toBe(0);
  await expect(sheet(page)).toBeVisible();
  expect(await isInert(retry), "retry inert while the sheet is open").toBe(
    true,
  );

  await page.keyboard.press("Escape");
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(dockToggle(page)).toBeFocused();

  // With the sheet closed the retry button is live, uncovered and a Tab stop.
  expect(await isInert(retry), "retry inert after closing").toBe(false);
  await retry.scrollIntoViewIfNeeded();
  const covered = await retry.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return !(hit && (hit === element || element.contains(hit)));
  });
  expect(covered, "retry button covered").toBe(false);
  if (browserName === "webkit") {
    // WebKit's default Tab order skips buttons (Safari's "Press Tab to highlight" is off), so
    // only that it takes focus is checked there.
    await retry.focus();
  } else {
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    for (let step = 0; step < 15 && !(await isFocused(retry)); step++)
      await page.keyboard.press("Tab");
  }
  await expect(retry).toBeFocused();
  await expectFocusVisible(page, "save banner retry button");
  expect(errors).toEqual([]);
});

test.describe("the bar while the page scrolls", () => {
  // Scrolls the window in one step (the page scrolls smoothly otherwise, in many small steps)
  // and waits until the scroll listeners have run.
  async function scrollTo(page: Page, y: number | "end"): Promise<void> {
    await page.evaluate(
      (target) =>
        new Promise<void>((resolve) => {
          const top =
            target === "end"
              ? document.documentElement.scrollHeight
              : (target as number);
          if (Math.abs(window.scrollY - top) < 1) return resolve();
          window.addEventListener(
            "scroll",
            () => requestAnimationFrame(() => resolve()),
            { once: true },
          );
          window.scrollTo({ top, behavior: "instant" });
        }),
      y,
    );
  }

  async function seedCamp(page: Page): Promise<void> {
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
    await page.goto("/");
    await expect(dockToggle(page)).toBeVisible();
  }

  test.describe("with motion", () => {
    test.use(MOTION);

    test("hides on scrolling down and comes back on focus, scrolling up and at the end", async ({
      page,
      browserName,
    }) => {
      await seedCamp(page);
      await scrollTo(page, 600);
      await expect(dock(page)).toHaveClass(/is-away/);

      // The bar follows the page in the Tab order: from the page's last control (focused
      // without scrolling, so the bar stays away) one Tab moves into the bar.
      await page.evaluate(() => {
        const controls = document.querySelectorAll<HTMLElement>(
          "main button:not([disabled]), main input, main [tabindex='0']",
        );
        controls[controls.length - 1]!.focus({ preventScroll: true });
      });
      await expect(dock(page)).toHaveClass(/is-away/);
      if (browserName === "webkit") {
        // WebKit's default Tab order skips buttons; focus the bar's toggle directly.
        await dockToggle(page).focus();
      } else {
        await page.keyboard.press("Tab");
      }
      await expect
        .poll(() =>
          dock(page).evaluate((element) =>
            element.contains(document.activeElement),
          ),
        )
        .toBe(true);
      await expect(dock(page)).not.toHaveClass(/is-away/);
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());

      await scrollTo(page, 1200);
      await expect(dock(page)).toHaveClass(/is-away/);
      await scrollTo(page, 1190);
      await expect(dock(page)).not.toHaveClass(/is-away/);

      await scrollTo(page, 1800);
      await expect(dock(page)).toHaveClass(/is-away/);
      await scrollTo(page, "end");
      await expect(dock(page)).not.toHaveClass(/is-away/);
    });

    test("the last strip's compare button stays above the taller blocked bar", async ({
      page,
    }) => {
      // A full camp squad without goalkeepers is blocked: two headline lines.
      await seedStorage(
        page,
        campSave({
          selectedIds: [
            ...idsInGroup("OBR", 8),
            ...idsInGroup("POM", 8),
            ...idsInGroup("ATA", 7),
          ],
          events: ["doctor", "captain", "scout"],
        }),
      );
      await page.goto("/");
      await expect(finalizeButton(page)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      const last = page.locator(".compare-btn").last();
      await last.focus();
      await expect(last).toBeFocused();
      await expect(dock(page)).not.toHaveClass(/is-away/);
      // With motion the page scrolls smoothly to the focused button, so this waits for it.
      await expect(() =>
        expectFocusVisible(page, "last compare button, blocked bar"),
      ).toPass();
    });
  });

  test("never hides with reduced motion", async ({ page }) => {
    await seedCamp(page);
    await scrollTo(page, 600);
    await scrollTo(page, 1200);
    await expect(dock(page)).not.toHaveClass(/is-away/);
  });
});
