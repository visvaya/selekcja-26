import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  CAMP_EVENT_CHOICES,
  dialog,
  dockToggle,
  finalizeButton,
  patchStorageFailures,
  saveAlert,
  setStorageFailureMode,
  squadCount,
  STORAGE_KEY,
  text,
} from "./helpers.ts";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

// Every screen and dialog state of the game. The test fails if one is not reached,
// so a new state has to be added here instead of silently escaping the scan.
const EXPECTED_STATES = [
  "intro",
  "camp list",
  "save error banner",
  "profile dialog",
  "comparison dialog",
  "event dialog",
  "formation map",
  "camp report dialog",
  "final list",
  "tournament report",
] as const;
type ScreenState = (typeof EXPECTED_STATES)[number];

async function scan(page: Page, state: ScreenState, scanned: Set<string>) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(", ")}`,
  );
  expect(violations, `axe violations on "${state}"`).toEqual([]);
  scanned.add(state);
}

test("every screen and dialog passes an axe WCAG 2.2 AA scan", async ({
  page,
}) => {
  // Nine full-page axe scans of a 61-card list take longer than a plain journey.
  test.setTimeout(300_000);
  const scanned = new Set<string>();
  await patchStorageFailures(page, STORAGE_KEY);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.introTitle }),
  ).toBeVisible();
  await scan(page, "intro", scanned);

  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();
  await scan(page, "camp list", scanned);

  await setStorageFailureMode(page, "failed");
  await page.locator(".select-btn").first().click();
  await expect(saveAlert(page)).toHaveText(text.save.messages.failed);
  await scan(page, "save error banner", scanned);
  await setStorageFailureMode(page, "none");
  // Toggle the same player back off, restoring the earlier selection while forcing a
  // successful save that clears the banner so the remaining states stay unaffected.
  await page.locator(".select-btn").first().click();
  await expect(saveAlert(page)).toHaveText("");

  await page.getByRole("button", { name: text.profile }).first().click();
  await expect(dialog(page)).toBeVisible();
  await scan(page, "profile dialog", scanned);
  await dialog(page).getByRole("button", { name: text.returnToList }).click();

  const compareButtons = page.locator(".compare-btn");
  await compareButtons.nth(0).click();
  await compareButtons.nth(1).click();
  await expect(dialog(page)).toHaveAccessibleName(text.comparisonTitle);
  await scan(page, "comparison dialog", scanned);
  await dialog(page)
    .getByRole("button", { name: text.clearComparison })
    .click();

  await page.getByRole("button", { name: text.autoFill }).click();
  await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
  await scan(page, "event dialog", scanned);
  for (const choice of CAMP_EVENT_CHOICES)
    await dialog(page)
      .getByRole("button", { name: new RegExp(choice) })
      .click();
  await expect(squadCount(page)).toHaveText("23/23");

  await dockToggle(page).click();
  await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
  await scan(page, "formation map", scanned);
  await dockToggle(page).click();

  await finalizeButton(page).click();
  await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
  await scan(page, "camp report dialog", scanned);
  await dialog(page)
    .getByRole("button", { name: text.continueToFinal })
    .click();

  await expect(
    page.getByRole("heading", { name: text.stages.final.heading }),
  ).toBeVisible();
  await scan(page, "final list", scanned);

  await page.getByRole("button", { name: text.autoFill }).click();
  await finalizeButton(page).click();
  await expect(
    page.getByRole("heading", { name: text.tournamentProgress }),
  ).toBeVisible();
  await scan(page, "tournament report", scanned);

  expect([...scanned]).toEqual([...EXPECTED_STATES]);
});
