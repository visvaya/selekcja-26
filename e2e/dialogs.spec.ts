import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";
import { RULES_REVISION } from "../src/data/constants.ts";
import {
  campSave,
  collectPageErrors,
  dialog,
  dockToggle,
  expectFocusVisible,
  finishedReportSave,
  idsInGroup,
  openBoard,
  outsidersSave,
  seedStorage,
  text,
  touchDrag,
  unfinishedOtherRulesSave,
} from "./helpers.ts";

// The dialog drawers, their hints and the confirmations in real browsers: dialogs over the
// open phone sheet, drawer gestures by width, the scrim, the hint's Escape order and the restart
// confirmation of the report. Runs in phone, phone-webkit and desktop-keyboard; each test skips
// the projects it does not belong to.

const PHONE = { width: 360, height: 740 };
const CENTRED = { width: 800, height: 740 };

function onlyIn(testInfo: TestInfo, projects: string[], reason: string) {
  test.skip(!projects.includes(testInfo.project.name), reason);
}

const PHONE_PROJECTS = ["phone", "phone-webkit"];

function sheet(page: Page): Locator {
  return page.getByRole("dialog", { name: text.sheetTitle });
}

function sheetHandle(page: Page): Locator {
  return page.locator(".phone-dock .phone-dock-handle");
}

function pitchOutsiders(page: Page): Locator {
  return page.locator(".phone-dock button.pitch-outsiders");
}

// "Cofnij" in the open sheet; undo closes the sheet, so it is opened again to read the pitch.
async function undoInSheet(page: Page): Promise<void> {
  await sheet(page).getByRole("button", { name: text.undo }).tap();
  await openBoard(page);
}

function profileButton(page: Page): Locator {
  return page
    .getByRole("button", { name: new RegExp(`^${text.profile}: `) })
    .first();
}

// Focuses the opener before tapping it: Safari does not focus a button on a tap.
async function tapOpener(opener: Locator): Promise<void> {
  await opener.focus();
  await opener.tap();
}

// Clicks the dimmed scrim above the dialog panel (or below it when the panel reaches the top).
async function clickScrim(page: Page): Promise<void> {
  const box = await dialog(page).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, "dialog panel has a box").not.toBeNull();
  const above = box!.y > 8;
  const y = above ? box!.y / 2 : (box!.y + box!.height + viewport.height) / 2;
  expect(
    above || box!.y + box!.height < viewport.height - 8,
    "some scrim is visible",
  ).toBe(true);
  await page.mouse.click(viewport.width / 2, y);
}

test.describe("outsiders drawer over the open phone sheet", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    onlyIn(testInfo, PHONE_PROJECTS, "the phone sheet exists below 1024 px");
    await page.setViewportSize(PHONE);
    await seedStorage(page, outsidersSave().save);
    await page.goto("/");
    await openBoard(page);
    await expect(pitchOutsiders(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
  });

  test("one row removal is one undo step", async ({ page }) => {
    const errors = collectPageErrors(page);
    const { outsiders } = outsidersSave();
    await tapOpener(pitchOutsiders(page));
    await expect(dialog(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    const removeFirst = dialog(page).getByRole("button", {
      name: text.playerAction(text.outsiderRemove, outsiders[0]!.name),
    });
    await removeFirst.tap();
    await expect(dialog(page)).toHaveAccessibleName(
      text.outOfFormationTitle(4),
    );
    // Focus moves to the next row's X, not to the heading or the opener.
    await expect(
      dialog(page).getByRole("button", {
        name: text.playerAction(text.outsiderRemove, outsiders[1]!.name),
      }),
    ).toBeFocused();

    await dialog(page).getByRole("button", { name: text.returnToPitch }).tap();
    await expect(dialog(page)).toBeHidden();
    await expect(sheet(page)).toBeVisible();
    await undoInSheet(page);
    await expect(pitchOutsiders(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    // The removal was the only step of this game: nothing is left to undo.
    await expect(
      sheet(page).getByRole("button", { name: text.undo }),
    ).toBeDisabled();
    expect(errors).toEqual([]);
  });

  test("the bulk removal keeps the sheet, focuses its handle and undoes in one step", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await tapOpener(pitchOutsiders(page));
    await expect(dialog(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    // The drawer above the sheet is live: its controls take taps.
    expect(
      await dialog(page).evaluate((element) => element.closest("[inert]")),
    ).toBeNull();
    await dialog(page)
      .getByRole("button", {
        name: new RegExp(`^${text.outsidersRemoveAllLead}`),
      })
      .tap();
    await expect(dialog(page)).toBeHidden();
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(sheetHandle(page)).toBeFocused();
    await expect(pitchOutsiders(page)).toHaveCount(0);

    await undoInSheet(page);
    await expect(pitchOutsiders(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    await tapOpener(pitchOutsiders(page));
    await expect(dialog(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    expect(errors).toEqual([]);
  });

  test("removing the outsiders one by one lands on the open sheet's handle", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await tapOpener(pitchOutsiders(page));
    for (let count = 5; count > 0; count -= 1) {
      await expect(dialog(page)).toHaveAccessibleName(
        text.outOfFormationTitle(count),
      );
      await dialog(page)
        .getByRole("button", { name: new RegExp(`^${text.outsiderRemove}: `) })
        .first()
        .tap();
    }
    await expect(dialog(page)).toBeHidden();
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(sheetHandle(page)).toBeFocused();
    expect(errors).toEqual([]);
  });
});

test.describe("drawer gestures by width", () => {
  function drawerHandle(page: Page): Locator {
    return dialog(page).locator(".dlg-handle");
  }

  async function openProfile(page: Page): Promise<Locator> {
    const opener = profileButton(page);
    await tapOpener(opener);
    await expect(dialog(page)).toBeVisible();
    return opener;
  }

  test.beforeEach(async ({ page, hasTouch }, testInfo) => {
    onlyIn(testInfo, PHONE_PROJECTS, "the drawer is a phone layout");
    test.skip(
      !hasTouch,
      "drag to close is a touch gesture; this project emulates no touch",
    );
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
  });

  test("at 360 px a long drag closes the profile and a short slow one springs back", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    const opener = await openProfile(page);
    await expect(drawerHandle(page)).toBeVisible();

    // 40 px over about 400 ms: neither far nor fast.
    await touchDrag(drawerHandle(page), 40, 20, 20);
    await expect(dialog(page)).toBeVisible();
    await expect
      .poll(() =>
        dialog(page).evaluate(
          (element) => (element as HTMLElement).style.transform,
        ),
      )
      .toBe("");

    // 200 px, slow enough not to count as a flick.
    await touchDrag(drawerHandle(page), 200, 20, 20);
    await expect(dialog(page)).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("at 800 px the centred dialog has an X and no handle, and a drag does nothing", async ({
    page,
  }) => {
    await page.setViewportSize(CENTRED);
    await page.goto("/");
    await openProfile(page);
    await expect(
      dialog(page).getByRole("button", { name: text.closeDialog }),
    ).toBeVisible();
    await expect(drawerHandle(page)).toBeHidden();
    await touchDrag(drawerHandle(page), 200, 20, 20);
    await expect(dialog(page)).toBeVisible();
  });

  test("a press that starts in the panel and ends on the scrim does not close", async ({
    page,
  }) => {
    await page.setViewportSize(CENTRED);
    await page.goto("/");
    await openProfile(page);
    const box = (await dialog(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y / 2, { steps: 5 });
    await page.mouse.up();
    await expect(dialog(page)).toBeVisible();

    // A whole click on the scrim closes the drawer-form profile.
    await clickScrim(page);
    await expect(dialog(page)).toBeHidden();
  });
});

test.describe("the scrim never closes a plain dialog", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    onlyIn(testInfo, ["phone"], "one engine is enough for a click target");
  });

  test("the event dialog", async ({ page }) => {
    await seedStorage(
      page,
      campSave({
        selectedIds: [...idsInGroup("BR", 2), ...idsInGroup("OBR", 7)],
        events: [],
      }),
    );
    await page.goto("/");
    await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
    await clickScrim(page);
    await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
  });

  test("the restart confirmation", async ({ page }) => {
    await seedStorage(page, finishedReportSave(RULES_REVISION));
    await page.goto("/");
    await tapOpener(page.getByRole("button", { name: text.restart }));
    await expect(dialog(page)).toHaveAccessibleName(text.confirmRestart.title);
    await clickScrim(page);
    await expect(dialog(page)).toHaveAccessibleName(text.confirmRestart.title);
  });

  test("a message", async ({ page }) => {
    await seedStorage(page, unfinishedOtherRulesSave());
    await page.goto("/");
    await expect(dialog(page)).toHaveAccessibleName(text.rulesChangedTitle);
    await clickScrim(page);
    await expect(dialog(page)).toHaveAccessibleName(text.rulesChangedTitle);
  });
});

test.describe("drawer layout at 360 px", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    onlyIn(testInfo, PHONE_PROJECTS, "the drawer is a phone layout");
    await page.setViewportSize(PHONE);
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
    await page.goto("/");
  });

  async function openComparison(page: Page): Promise<void> {
    const compare = page.locator(".compare-btn");
    await compare.nth(0).tap();
    await compare.nth(1).tap();
    await expect(dialog(page)).toHaveAccessibleName(text.comparisonEyebrow);
  }

  test("the profile header stacks the score under the name", async ({
    page,
  }) => {
    await tapOpener(profileButton(page));
    const name = dialog(page).getByRole("heading", { level: 2 });
    const score = dialog(page).locator(".profile-score");
    const nameBox = (await name.boundingBox())!;
    const scoreBox = (await score.boundingBox())!;
    expect(scoreBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
  });

  test("the comparison footer: primary across, two secondary buttons in one row", async ({
    page,
  }) => {
    await openComparison(page);
    const footer = dialog(page).locator(".dlg-footer");
    const primary = footer.locator(".primary");
    const secondary = footer.locator(".action-button");
    await expect(secondary).toHaveCount(2);
    const footerBox = (await footer.boundingBox())!;
    const primaryBox = (await primary.boundingBox())!;
    const [left, right] = [
      (await secondary.nth(0).boundingBox())!,
      (await secondary.nth(1).boundingBox())!,
    ];
    expect(primaryBox.width).toBeGreaterThan(footerBox.width * 0.8);
    expect(Math.abs(left.y - right.y)).toBeLessThan(1);
    expect(right.x).toBeGreaterThan(left.x + left.width - 1);
    expect(left.y).toBeGreaterThanOrEqual(primaryBox.y + primaryBox.height);
  });

  test("200 % text: no horizontal scroll, the footer stays and the body scrolls", async ({
    page,
  }) => {
    // Through element.style: the production Content-Security-Policy blocks injected styles.
    await page.evaluate(() =>
      document.documentElement.style.setProperty("font-size", "200%"),
    );
    await openComparison(page);
    const overflow = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>(
        '[role="dialog"]:not(.phone-dock)',
      )!;
      return {
        page:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        panel: panel.scrollWidth - panel.clientWidth,
      };
    });
    expect(overflow.page, "page scrolls horizontally").toBeLessThanOrEqual(0);
    expect(overflow.panel, "panel scrolls horizontally").toBeLessThanOrEqual(0);

    const footer = dialog(page).locator(".dlg-footer");
    await expect(footer).toBeInViewport({ ratio: 1 });
    const scroll = dialog(page).locator(".dlg-scroll");
    const scrolled = await scroll.evaluate((element) => {
      const room = element.scrollHeight - element.clientHeight;
      element.scrollTop = room;
      return { room, top: element.scrollTop };
    });
    expect(scrolled.room).toBeGreaterThan(0);
    expect(scrolled.top).toBeGreaterThan(0);
    await expect(footer).toBeInViewport({ ratio: 1 });
  });
});

test.describe("desktop hints", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    onlyIn(testInfo, ["desktop-keyboard"], "hover hints need a mouse");
  });

  test("Escape hides the X's hint first, then closes the profile", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
    await page.goto("/");
    const opener = profileButton(page);
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();

    const close = dialog(page).getByRole("button", { name: text.closeDialog });
    const tip = close.getByRole("tooltip");
    await expect(close).toHaveAccessibleDescription(text.closeDialogHint);
    await close.hover();
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(opener).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("the last outsiders row shows its whole hint", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedStorage(page, outsidersSave().save);
    await page.goto("/");
    await page.locator("button.pitch-outsiders").first().click();
    await expect(dialog(page)).toHaveAccessibleName(
      text.outOfFormationTitle(5),
    );
    const last = dialog(page)
      .getByRole("button", { name: new RegExp(`^${text.outsiderRemove}: `) })
      .last();
    await last.hover();
    const tip = last.getByRole("tooltip");
    await expect(tip).toBeVisible();
    // The tip is not clipped by the scrolling body: its corners are on screen and on top.
    const uncovered = await tip.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const points = [
        [rect.left + 2, rect.top + 2],
        [rect.right - 2, rect.bottom - 2],
      ];
      return points.every(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!);
        return hit !== null && (hit === element || element.contains(hit));
      });
    });
    expect(uncovered, "the last row's hint is fully visible").toBe(true);
  });
});

test.describe("restart from the report", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    onlyIn(testInfo, ["desktop-keyboard"], "a keyboard journey");
    await seedStorage(page, finishedReportSave(RULES_REVISION));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: text.outcomes.roundOf16 }),
    ).toBeVisible();
  });

  function restart(page: Page): Locator {
    return page.getByRole("button", { name: text.restart });
  }

  async function openConfirmation(page: Page): Promise<void> {
    await restart(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alertdialog")).toHaveAccessibleName(
      text.confirmRestart.title,
    );
    await expect(page.getByRole("alertdialog")).toHaveAccessibleDescription(
      text.confirmRestart.description,
    );
    await expect(
      dialog(page).getByRole("button", { name: text.confirmRestart.cancel }),
    ).toBeFocused();
  }

  test("Enter right after opening and Escape both keep the report", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openConfirmation(page);
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeHidden();
    await expect(
      page.getByRole("heading", { name: text.outcomes.roundOf16 }),
    ).toBeVisible();
    await expect(restart(page)).toBeFocused();

    await openConfirmation(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(restart(page)).toBeFocused();
    await expectFocusVisible(page, "restart confirmation cancelled");
    expect(errors).toEqual([]);
  });

  test("confirming shows the start screen with its heading focused", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openConfirmation(page);
    await dialog(page)
      .getByRole("button", { name: text.confirmRestart.confirm })
      .focus();
    await page.keyboard.press("Enter");
    const heading = page.getByRole("heading", { name: text.ticket.title });
    await expect(heading).toBeFocused();
    await expect(dialog(page)).toHaveCount(0);
    await expectFocusVisible(page, "restart confirmed");
    expect(errors).toEqual([]);
  });
});
