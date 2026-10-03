import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { CHANGELOG } from "../src/data/changelog.ts";
import {
  boardRegion,
  CAMP_EVENT_CHOICES,
  campSave,
  dialog,
  closeBoard,
  dockToggle,
  openBoard,
  finalizeButton,
  finalSave,
  finishedOtherRulesReportSave,
  forceSaveErrorBanner,
  idsInGroup,
  patchStorageFailures,
  saveAlert,
  seedStorage,
  setStorageFailureMode,
  squadCount,
  STORAGE_KEY,
  text,
  unfinishedOtherRulesSave,
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
  "intro changelog expanded",
  "camp list",
  "filters panel open",
  "empty list",
  "save error banner",
  "profile dialog",
  "comparison dialog",
  "event dialog",
  "formation map",
  "camp report dialog",
  "final list",
  "final list camp squad only",
  "tournament report",
  "rules changed notice",
  "older rules report",
  "side board camp",
  "side board final with excess",
  "phone sheet open",
  "phone landscape sheet open",
] as const;
type ScreenState = (typeof EXPECTED_STATES)[number];

// The side board states run in this phone project at desktop width.
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
// The open phone sheet in both orientations; landscape has its own two-column layout.
const SHEET_VIEWPORTS = [
  { state: "phone sheet open", viewport: { width: 360, height: 740 } },
  {
    state: "phone landscape sheet open",
    viewport: { width: 740, height: 360 },
  },
] as const;

// The candidate list renders every card with the same PlayerCard component, so once its markup
// is scanned in full on "camp list" and "final list" (the two required full-list scans; the
// final-stage card has an extra camp-result line the camp-stage card never renders, so it needs
// its own full scan), repeated cards on every other state, which mostly stays open behind
// dialogs or the formation dock, add scan time without adding coverage. Keeping the first few
// still exercises the list container and its layout.
const REPEATED_CARD_SELECTOR = ".players .player:nth-child(n+4)";

async function scan(
  page: Page,
  state: ScreenState,
  scanned: Set<string>,
  { fullList = false }: { fullList?: boolean } = {},
) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (!fullList) builder = builder.exclude(REPEATED_CARD_SELECTOR);
  const results = await builder.analyze();
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

// The two save-related states need a fresh page with seeded localStorage, so they run as their
// own tests rather than steps in the game-screens test below. describe.serial guarantees all
// three tests run in order in the same worker, so the closed-over `scanned` set accumulates
// across them and the last test can still assert every EXPECTED_STATES entry was reached.
test.describe.serial("axe WCAG 2.2 AA scan", () => {
  const scanned = new Set<string>();

  test("every screen and dialog passes an axe WCAG 2.2 AA scan", async ({
    page,
  }) => {
    // Fourteen axe scans across a full game, three of them full list scans, still take
    // longer than a plain journey.
    test.setTimeout(300_000);
    await patchStorageFailures(page, STORAGE_KEY);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: text.ticket.title }),
    ).toBeVisible();
    await scan(page, "intro", scanned);

    // Located by aria-controls rather than accessible name: the button's own label changes
    // ("Wcześniejsze zmiany (N)" to "Ukryj wcześniejsze zmiany") when it toggles.
    const changelogToggle = page.locator('[aria-controls="changelog-older"]');
    await expect(changelogToggle).toHaveAccessibleName(
      text.changelogShowOlder(CHANGELOG.length - 1),
    );
    await changelogToggle.click();
    await expect(changelogToggle).toHaveAttribute("aria-expanded", "true");
    await expect(changelogToggle).toHaveAccessibleName(text.changelogHideOlder);
    await scan(page, "intro changelog expanded", scanned);
    await changelogToggle.click();

    await page.getByRole("button", { name: text.start }).click();
    await expect(
      page.getByRole("heading", { name: text.stages.camp.heading }),
    ).toBeVisible();
    await scan(page, "camp list", scanned, { fullList: true });

    const filtersToggle = page.locator(".filters-toggle");
    await filtersToggle.click();
    await expect(filtersToggle).toHaveAttribute("aria-expanded", "true");
    await scan(page, "filters panel open", scanned);
    await filtersToggle.click();

    const search = page.getByLabel(text.searchLabel);
    await search.fill("xyz");
    await expect(page.getByText(text.noCandidates)).toBeVisible();
    await scan(page, "empty list", scanned);
    await page.getByRole("button", { name: text.clearFilters }).click();
    await expect(page.locator(".list-count")).toHaveText(
      text.visibleCount(61, 61),
    );

    await forceSaveErrorBanner(page);
    await scan(page, "save error banner", scanned);
    await setStorageFailureMode(page, "none");
    // Toggle the same player back off, restoring the earlier selection while forcing a
    // successful save that clears the banner so the remaining states stay unaffected.
    await page.locator(".select-btn").first().click();
    await expect(saveAlert(page)).toHaveText("");

    await page
      .getByRole("button", { name: new RegExp(`^${text.profile}: `) })
      .first()
      .click();
    await expect(dialog(page)).toBeVisible();
    await scan(page, "profile dialog", scanned);
    await dialog(page).getByRole("button", { name: text.returnToList }).click();

    const compareButtons = page.locator(".compare-btn");
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    await expect(dialog(page)).toHaveAccessibleName(text.comparisonEyebrow);
    await scan(page, "comparison dialog", scanned);
    await dialog(page)
      .getByRole("button", { name: text.clearComparison })
      .click();

    await openBoard(page);
    await page.getByRole("button", { name: text.autoFill }).click();
    await expect(dialog(page)).toHaveAccessibleName(text.events.doctor.title);
    await scan(page, "event dialog", scanned);
    for (const choice of CAMP_EVENT_CHOICES)
      await dialog(page)
        .getByRole("button", { name: new RegExp(choice) })
        .click();
    await expect(squadCount(page)).toHaveText("23/23");

    // The board sheet stays open after the events: it shows the formation map.
    await expect(dockToggle(page)).toHaveAttribute("aria-expanded", "true");
    await scan(page, "formation map", scanned);
    await closeBoard(page);

    await finalizeButton(page).click();
    await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
    await scan(page, "camp report dialog", scanned);
    await dialog(page)
      .getByRole("button", { name: text.continueToFinal })
      .click();

    await expect(
      page.getByRole("heading", { name: text.stages.final.heading }),
    ).toBeVisible();
    await scan(page, "final list", scanned, { fullList: true });

    const onlyCamp = page.getByRole("checkbox", { name: text.onlyCamp(23) });
    await onlyCamp.check();
    await expect(page.locator(".list-count")).toHaveText(
      text.visibleCount(23, 61),
    );
    await scan(page, "final list camp squad only", scanned, { fullList: true });
    await onlyCamp.uncheck();

    await openBoard(page);
    await page.getByRole("button", { name: text.autoFill }).click();
    await finalizeButton(page).click();
    await expect(
      page.getByRole("heading", { name: text.tournamentProgress }),
    ).toBeVisible();
    await scan(page, "tournament report", scanned);
  });

  test("rules changed notice from an unfinished save with other rules", async ({
    page,
  }) => {
    await seedStorage(page, unfinishedOtherRulesSave());
    await page.goto("/");
    await expect(dialog(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: text.rulesChangedTitle }),
    ).toBeVisible();
    await scan(page, "rules changed notice", scanned);
  });

  test("side board camp at desktop width", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await seedStorage(
      page,
      campSave({ selectedIds: idsInGroup("BR", 2), events: [] }),
    );
    await page.goto("/");
    await expect(boardRegion(page)).toHaveAccessibleName(text.boardRegion.camp);
    await scan(page, "side board camp", scanned);
  });

  test("side board final with excess at desktop width", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    // A fourth goalkeeper above the exact quota shows the red excess square and marker.
    await seedStorage(
      page,
      finalSave({
        selectedIds: [
          ...idsInGroup("BR", 4),
          ...idsInGroup("OBR", 6),
          ...idsInGroup("POM", 6),
          ...idsInGroup("ATA", 5),
        ],
      }),
    );
    await page.goto("/");
    await expect(boardRegion(page)).toHaveAccessibleName(
      text.boardRegion.final,
    );
    await expect(boardRegion(page)).toContainText(text.excessMarker(1));
    await scan(page, "side board final with excess", scanned);
  });

  for (const { state, viewport } of SHEET_VIEWPORTS)
    test(`${state}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // One goalkeeper short of the camp quota, so the squares and the markers show a gap.
      await seedStorage(
        page,
        campSave({
          selectedIds: [...idsInGroup("BR", 1), ...idsInGroup("OBR", 3)],
          events: [],
        }),
      );
      await page.goto("/");
      await openBoard(page);
      await expect(
        page.getByRole("dialog", { name: text.sheetTitle }),
      ).toBeVisible();
      await scan(page, state, scanned);
    });

  test("older rules report from a finished save with other rules", async ({
    page,
  }) => {
    await seedStorage(page, finishedOtherRulesReportSave());
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: text.outcomes.roundOf16 }),
    ).toBeVisible();
    await expect(page.getByText(text.reportFromOlderRules)).toBeVisible();
    await scan(page, "older rules report", scanned);

    // Every EXPECTED_STATES entry must have been scanned by one of the tests above; this
    // test runs last (describe.serial), so it is the only reliable place for the full check.
    expect([...scanned].sort()).toEqual([...EXPECTED_STATES].sort());
  });
});
