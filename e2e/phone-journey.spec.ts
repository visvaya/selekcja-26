import { expect, test } from "@playwright/test";
import {
  CAMP_EVENT_CHOICES,
  collectPageErrors,
  dialog,
  dockToggle,
  expectCoherentReport,
  expectFocusVisible,
  expectNoHorizontalScroll,
  finalizeButton,
  readReport,
  squadCount,
  text,
} from "./helpers.ts";

test("full two-stage journey on a narrow phone survives reload, undo and restart", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: new RegExp(text.systems["4231"].name),
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: text.start }).tap();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(squadCount(page)).toHaveText("0/23");
  await expectNoHorizontalScroll(page);
  await expectFocusVisible(page, "start -> camp");

  // A random fill crosses every event threshold; undo inside the blocking
  // event dialog reverts the whole fill as one step.
  await page.getByRole("button", { name: text.autoFill }).tap();
  await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
  await expectFocusVisible(page, "random fill dialog open");
  await dialog(page).getByRole("button", { name: text.undo }).tap();
  await expect(dialog(page)).toBeHidden();
  await expect(squadCount(page)).toHaveText("0/23");
  await expectFocusVisible(page, "random fill dialog undo (closed)");

  await page.getByRole("button", { name: text.autoFill }).tap();
  for (const choice of CAMP_EVENT_CHOICES) {
    await expect(dialog(page)).toBeVisible();
    await expectFocusVisible(page, `event dialog open (${choice})`);
    await dialog(page)
      .getByRole("button", { name: new RegExp(choice) })
      .tap();
  }
  await expect(dialog(page)).toBeHidden();
  await expect(squadCount(page)).toHaveText("23/23");
  await expectFocusVisible(page, "event dialogs closed");

  // The dock stays reachable at the bottom of a long list.
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(finalizeButton(page)).toBeInViewport();
  await expect(finalizeButton(page)).toBeEnabled();

  await dockToggle(page).tap();
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("img", { name: new RegExp(text.systems["4231"].name) }),
  ).toBeVisible();
  const outsiders = page.locator(".formation-outsiders");
  if (await outsiders.isVisible()) {
    await outsiders.tap();
    await expect(dialog(page)).toBeVisible();
    await expectFocusVisible(page, "outsiders dialog open");
    await dialog(page).getByRole("button", { name: text.returnToPitch }).tap();
    await expect(dialog(page)).toBeHidden();
    await expectFocusVisible(page, "outsiders dialog close");
  }
  await dockToggle(page).tap();
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expectNoHorizontalScroll(page);

  // Progress, resolved events and undo history persist across a reload.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await expect(squadCount(page)).toHaveText("23/23");
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole("button", { name: text.undo })).toBeEnabled();

  await finalizeButton(page).tap();
  await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
  await expectFocusVisible(page, "camp report dialog open");
  await dialog(page).getByRole("button", { name: text.continueToFinal }).tap();
  await expect(
    page.getByRole("heading", { name: text.stages.final.heading }),
  ).toBeVisible();
  await expect(squadCount(page)).toHaveText("0/26");
  await expect(
    page.locator(".tag", { hasText: text.campResult }).first(),
  ).toBeVisible();
  await expectFocusVisible(page, "camp -> final");

  await page.getByRole("button", { name: text.autoFill }).tap();
  await expect(squadCount(page)).toHaveText("26/26");
  await expect(finalizeButton(page)).toBeEnabled();
  await finalizeButton(page).tap();

  await expect(
    page.getByRole("heading", { name: text.tournamentProgress }),
  ).toBeVisible();
  await expectFocusVisible(page, "final -> tournament report");
  await expectCoherentReport(page);
  await expectNoHorizontalScroll(page);
  const report = await readReport(page);

  // A saved report is restored, not re-simulated.
  await page.reload();
  expect(await readReport(page)).toEqual(report);

  // The report is final: it offers no undo (owner decision, 2026-09-25).
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(0);

  await page.getByRole("button", { name: text.restart }).tap();
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(0);
  await expectFocusVisible(page, "restart");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});
