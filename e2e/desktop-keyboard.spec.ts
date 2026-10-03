import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import {
  boardRegion,
  collectPageErrors,
  dialog,
  expectCoherentReport,
  expectFocusVisible,
  finalizeButton,
  squadCount,
  text,
} from "./helpers.ts";

const MAX_TAB_STEPS = 40;

async function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
}

async function tabUntil(page: Page, target: Locator): Promise<string[]> {
  const visited: string[] = [];
  for (let step = 0; step < MAX_TAB_STEPS; step++) {
    await page.keyboard.press("Tab");
    visited.push(await focusedText(page));
    if (await target.evaluate((element) => element === document.activeElement))
      return visited;
  }
  throw new Error(
    `Tab never reached the target. Visited: ${visited.join(" | ")}`,
  );
}

async function expectVisibleFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  const outline = await target.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(outline, "keyboard focus must be visible").not.toBe("none");
}

async function activate(page: Page, target: Locator, key = "Enter") {
  await target.focus();
  await page.keyboard.press(key);
}

test("desktop game is playable with the keyboard alone", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();

  // The formation group is one Tab stop on the checked radio; arrows change the choice.
  const radio4231 = page.getByRole("radio", {
    name: new RegExp(`^${text.systems["4231"].name} `),
  });
  const radio433 = page.getByRole("radio", {
    name: new RegExp(`^${text.systems["433"].name} `),
  });
  await tabUntil(page, radio4231);
  await expect(radio4231).toBeFocused();
  const cardOutline = await radio4231
    .locator("xpath=..")
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(cardOutline, "the focused formation card shows the ring").not.toBe(
    "none",
  );
  const checkedRadio = page.getByRole("radio", { checked: true });
  let previousValue = "";
  for (let step = 0; step < 3 && !(await radio433.isChecked()); step++) {
    previousValue = await checkedRadio.inputValue();
    await page.keyboard.press("ArrowRight");
  }
  await expect(radio433).toBeChecked();
  await expect(page.getByRole("img", { name: /^4–3–3/ })).toBeVisible();

  // Space on the checked formation changes nothing.
  await page.keyboard.press("Space");
  await expect(radio433).toBeChecked();
  await expect(page.getByRole("img", { name: /^4–3–3/ })).toBeVisible();

  // Undo from the keyboard restores the formation before the last change.
  expect(previousValue, "arrows changed the formation").not.toBe("");
  const previousName =
    text.systems[previousValue as keyof typeof text.systems].name;
  await activate(page, page.getByRole("button", { name: text.undo }));
  await expect(page.locator(`input[value="${previousValue}"]`)).toBeChecked();
  await expect(
    page.getByRole("img", { name: new RegExp(`^${previousName}`) }),
  ).toBeVisible();

  // Back to 4–3–3 for the rest of the journey.
  await radio433.focus();
  await page.keyboard.press("Space");
  await expect(radio433).toBeChecked();
  const start = page.getByRole("button", { name: text.start });
  await page.keyboard.press("Tab");
  await expect(start).toBeFocused();
  await expectVisibleFocus(start);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(text.systems["433"].name);
  await expectFocusVisible(page, "start -> camp");

  // Profile dialog: focus moves to its heading, Tab is trapped, Escape closes and restores
  // focus.
  const profile = page
    .getByRole("button", { name: new RegExp(`^${text.profile}: `) })
    .first();
  await activate(page, profile);
  await expect(dialog(page)).toBeVisible();
  const dialogButtons = dialog(page).getByRole("button");
  await expect(dialog(page).getByRole("heading", { level: 2 })).toBeFocused();
  await expectFocusVisible(page, "profile dialog open");
  // the X comes first, then the footer buttons; Tab wraps in both directions
  await page.keyboard.press("Shift+Tab");
  await expect(dialogButtons.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogButtons.last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialogButtons.first()).toBeFocused();
  // on the X the first Escape only dismisses its hint; the next one closes the dialog
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(profile).toBeFocused();
  await expectFocusVisible(page, "profile dialog close");

  // Comparison of two candidates, then clearing it from the dialog.
  const compareButtons = page.locator(".compare-btn");
  await activate(page, compareButtons.nth(0));
  await activate(page, compareButtons.nth(1));
  await expect(dialog(page)).toHaveAccessibleName(text.comparisonTitle);
  await expectFocusVisible(page, "comparison dialog open");
  const clear = dialog(page).getByRole("button", {
    name: text.clearComparison,
  });
  await tabUntil(page, clear);
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('.compare-btn[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expectFocusVisible(page, "comparison dialog close");

  // Position filter and search.
  const leftBack = page.getByRole("button", { name: /^LO \(0\// });
  await activate(page, leftBack, "Space");
  await expect(leftBack).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: text.positions.LO }),
  ).toBeVisible();
  await activate(
    page,
    page.getByRole("button", { name: /^Wszyscy \(0\/61\)/ }),
  );
  const search = page.getByRole("searchbox", { name: text.searchLabel });
  await search.focus();
  await page.keyboard.type("Kochalski");
  await expect(page.locator(".player")).toHaveCount(1);
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");

  // Detailed filters: the disclosure follows the search field; its skip link leads to the list.
  await page.keyboard.press("Tab");
  const filtersToggle = page.getByRole("button", { name: text.detailFilters });
  await expect(filtersToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(filtersToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: text.skipToList });
  await expect(skipLink).toBeFocused();
  await expectFocusVisible(page, "filters panel skip link");

  // Inside the panel Space ticks a trait and the visible count follows at once; Escape is
  // harmless (no dialog to close, the tick and the focus stay).
  const count = page.locator(".list-count");
  await expect(count).toHaveText(text.visibleCount(61, 61));
  const pace = page.getByRole("checkbox", { name: text.roles.pace });
  await tabUntil(page, pace);
  await expectVisibleFocus(pace);
  await page.keyboard.press("Space");
  await expect(pace).toBeChecked();
  await expect(count).not.toHaveText(text.visibleCount(61, 61));
  await page.keyboard.press("Escape");
  await expect(pace).toBeChecked();
  await expect(pace).toBeFocused();
  await expect(filtersToggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(pace).not.toBeChecked();
  await expect(count).toHaveText(text.visibleCount(61, 61));

  // The skip link moves focus to the list heading.
  await activate(page, skipLink);
  await expect(page.locator(".section-label h2")).toBeFocused();
  await expectFocusVisible(page, "skip link to the list heading");

  // With the panel closed every position chip is a Tab stop with a visible focus ring.
  await activate(page, filtersToggle);
  await expect(filtersToggle).toHaveAttribute("aria-expanded", "false");
  const chips = page
    .getByRole("group", { name: text.positionChipsLabel })
    .getByRole("button");
  const chipCount = await chips.count();
  expect(chipCount).toBeGreaterThan(1);
  await tabUntil(page, chips.first());
  for (let index = 0; index < chipCount; index++) {
    await expectVisibleFocus(chips.nth(index));
    if (index < chipCount - 1) await page.keyboard.press("Tab");
  }

  // Event dialogs are blocking: Escape does not dismiss them.
  await activate(page, page.getByRole("button", { name: text.autoFill }));
  await expect(dialog(page)).toBeVisible();
  await expectFocusVisible(page, "random fill dialog open");
  for (const event of Object.values(text.events)) {
    await expect(dialog(page)).toHaveAccessibleName(event.title);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveAccessibleName(event.title);
    await expect(
      dialog(page).getByRole("button", {
        name: new RegExp(event.choices[0]!.title),
      }),
    ).toBeFocused();
    await expectFocusVisible(page, `event dialog open (${event.title})`);
    await page.keyboard.press("Enter");
  }
  await expect(dialog(page)).toBeHidden();
  await expect(squadCount(page)).toHaveText("23/23");
  await expectFocusVisible(page, "event dialogs closed");

  // The side board is one focusable region with a visible ring and no toggle; the stage
  // button is the next Tab stop inside it.
  const board = boardRegion(page);
  await expect(board).toHaveAccessibleName(text.boardRegion.camp);
  await expect(board.locator("button.dock-copy")).toHaveCount(0);
  // Reached forward from the list heading, the way the page reads; a search keeps the list
  // short, and is cleared afterwards.
  await search.fill("Lewandowski");
  await expect(page.locator(".player")).toHaveCount(1);
  await page.locator(".list-heading h2").focus();
  await tabUntil(page, board);
  await expectVisibleFocus(board);
  await expectFocusVisible(page, "side board region");
  await page.keyboard.press("Tab");
  await expect(board.locator(".finalize")).toBeFocused();
  await expectVisibleFocus(finalizeButton(page));
  await search.fill("");
  await finalizeButton(page).focus();

  await activate(page, finalizeButton(page));
  await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
  await expect(
    dialog(page).getByRole("button", { name: text.continueToFinal }),
  ).toBeFocused();
  await expectFocusVisible(page, "camp report dialog open");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: text.stages.final.heading }),
  ).toBeVisible();
  await expectFocusVisible(page, "camp -> final");

  await activate(page, page.getByRole("button", { name: text.autoFill }));
  await expect(squadCount(page)).toHaveText("26/26");
  await activate(page, finalizeButton(page));
  await expect(
    page.getByRole("heading", { name: text.tournamentProgress }),
  ).toBeVisible();
  await expectFocusVisible(page, "final -> tournament report");
  await expectCoherentReport(page);

  await activate(page, page.getByRole("button", { name: text.restart }));
  await expect(dialog(page)).toHaveAccessibleName(text.confirmRestart.title);
  await expect(
    dialog(page).getByRole("button", { name: text.confirmRestart.cancel }),
  ).toBeFocused();
  await activate(
    page,
    dialog(page).getByRole("button", { name: text.confirmRestart.confirm }),
  );
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  await expectFocusVisible(page, "restart");

  expect(errors).toEqual([]);
});

test("checked formation keeps an outline in forced colours", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "forced colours emulation is Chromium-only",
  );
  await page.goto("/");
  const checked = page.getByRole("radio", { checked: true });
  // Without forced colours the dot keeps the --select token.
  const normal = await checked.evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.background = "var(--select)";
    document.body.append(probe);
    const select = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { dot: getComputedStyle(element).backgroundColor, select };
  });
  expect(normal.dot).toBe(normal.select);

  await page.emulateMedia({ forcedColors: "active" });
  const outline = await checked
    .locator("xpath=..")
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");

  // The checked dot is filled with the system Highlight colour.
  const fill = await checked.evaluate((element) => {
    const probe = document.createElement("div");
    probe.style.background = "Highlight";
    document.body.append(probe);
    const highlight = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      dot: getComputedStyle(element).backgroundColor,
      card: getComputedStyle(element.parentElement!).backgroundColor,
      highlight,
    };
  });
  expect(fill.dot).not.toBe("rgba(0, 0, 0, 0)");
  expect(fill.dot).not.toBe(fill.card);
  expect(fill.dot).toBe(fill.highlight);

  // Keyboard focus on the checked card must look different from checked alone.
  const ring = (element: Element) => {
    const style = getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineOffset}`;
  };
  const checkedOnly = await checked.locator("xpath=..").evaluate(ring);
  await tabUntil(page, checked);
  const focused = await checked.locator("xpath=..").evaluate(ring);
  expect(focused).not.toBe(checkedOnly);
});
