import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import {
  collectPageErrors,
  dialog,
  dockToggle,
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
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();

  // Tab order reaches every system and priority choice before the start button.
  const system433 = page.getByRole("button", {
    name: new RegExp(text.systems["433"].name),
  });
  await tabUntil(page, system433);
  await expectVisibleFocus(system433);
  await page.keyboard.press("Space");
  await expect(system433).toHaveAttribute("aria-pressed", "true");
  const start = page.getByRole("button", { name: text.start });
  const visited = await tabUntil(page, start);
  for (const priority of Object.values(text.priorities))
    expect(visited.some((label) => label.includes(priority.name))).toBe(true);
  await expectVisibleFocus(start);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(page.locator(".game-head .eyebrow")).toContainText(
    text.systems["433"].name,
  );
  await expectFocusVisible(page, "start -> camp");

  // Profile dialog: focus moves in, Tab is trapped, Escape closes and restores focus.
  const profile = page.getByRole("button", { name: text.profile }).first();
  await activate(page, profile);
  await expect(dialog(page)).toBeVisible();
  const dialogButtons = dialog(page).getByRole("button");
  await expect(dialogButtons.first()).toBeFocused();
  await expectFocusVisible(page, "profile dialog open");
  const buttonCount = await dialogButtons.count();
  for (let step = 0; step < buttonCount; step++)
    await page.keyboard.press("Tab");
  await expect(dialogButtons.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogButtons.last()).toBeFocused();
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
  const leftBack = page.getByRole("button", { name: "LO (0)" });
  await activate(page, leftBack, "Space");
  await expect(leftBack).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: text.positions.LO }),
  ).toBeVisible();
  await activate(page, page.getByRole("button", { name: "Wszyscy (0)" }));
  const search = page.getByRole("searchbox", { name: text.searchLabel });
  await search.focus();
  await page.keyboard.type("Kochalski");
  await expect(page.locator(".player")).toHaveCount(1);
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");

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

  await activate(page, dockToggle(page));
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");

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
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  await expectFocusVisible(page, "restart");

  expect(errors).toEqual([]);
});
