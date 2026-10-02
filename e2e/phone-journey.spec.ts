import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { players, systems } from "../src/data/catalog.ts";
import { detailedPositions } from "../src/logic/selection.ts";
import { GAME_VERSION } from "../src/data/changelog.ts";
import type { GroupPosition } from "../src/data/types.ts";
import {
  CAMP_EVENT_CHOICES,
  campSave,
  collectPageErrors,
  dialog,
  dockToggle,
  expectCoherentReport,
  expectFocusVisible,
  expectNoHorizontalScroll,
  finalizeButton,
  readReport,
  seedStorage,
  squadCount,
  text,
} from "./helpers.ts";

test("full two-stage journey on a narrow phone survives reload, undo and restart", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", {
      name: new RegExp(`^${text.systems["4231"].name}`),
    }),
  ).toBeChecked();
  await expectNoHorizontalScroll(page);

  // Below 420 px the version and the stage label are hidden visually but stay in the
  // accessible text of the top bar.
  await expect(page.locator(".phase-group")).toContainText(text.phaseLabel);
  await expect(
    page
      .locator(".topbar")
      .getByText(text.topBarVersionAccessible(GAME_VERSION)),
  ).toBeAttached();
  const labelBox = await page.locator(".phase-label").boundingBox();
  expect(labelBox?.width ?? 0).toBeLessThanOrEqual(1);
  expect(labelBox?.height ?? 0).toBeLessThanOrEqual(1);

  // 3-4-2-1 has no wingers, so a winger called up below stays outside the formation.
  await page
    .getByRole("radio", { name: new RegExp(`^${text.systems["3421"].name}`) })
    .tap();
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

  // A player with no 3-4-2-1 position keeps the outsiders strip on the pitch whatever the
  // random fill adds; the fill keeps earlier call-ups.
  const search = page.getByLabel(text.searchLabel);
  await search.fill(OUTSIDER_3421.name);
  await page.locator(".select-btn").first().tap();
  await expect(squadCount(page)).toHaveText("1/23");
  await search.fill("");
  // Back to the top, as before the call-up: the journey's focus checks start from there.
  await page.evaluate(() => window.scrollTo(0, 0));

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
    page.getByRole("img", { name: new RegExp(text.systems["3421"].name) }),
  ).toBeVisible();
  const outsiders = page.getByRole("button", { name: /^Poza ustawieniem: / });
  await expect(outsiders).toBeVisible();
  await outsiders.tap();
  await expect(dialog(page)).toBeVisible();
  await expectFocusVisible(page, "outsiders dialog open");
  await dialog(page).getByRole("button", { name: text.returnToPitch }).tap();
  await expect(dialog(page)).toBeHidden();
  await expectFocusVisible(page, "outsiders dialog close");
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
  await expect(
    page.getByRole("checkbox", { name: text.onlyCamp(23) }),
  ).toBeVisible();

  // A lone "-" in the signed camp range is unparsable (validity.badInput) and is cleared on blur.
  const filtersToggle = page.locator(".filters-toggle");
  await filtersToggle.tap();
  const campFrom = page.getByRole("spinbutton", {
    name: text.rangeFrom(text.ranges.campImpact),
  });
  await campFrom.focus();
  const badInput = () =>
    campFrom.evaluate((input) => (input as HTMLInputElement).validity.badInput);
  await campFrom.pressSequentially("-");
  expect(await badInput(), "the lone minus was typed").toBe(true);
  await campFrom.blur();
  expect(await badInput(), "blur clears the unreadable text").toBe(false);
  await expect(campFrom).toHaveValue("");
  await expect(filtersToggle).toHaveAccessibleName(text.detailFilters);
  await filtersToggle.tap();
  await expect(filtersToggle).toHaveAttribute("aria-expanded", "false");

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
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: text.undo })).toHaveCount(0);
  await expectFocusVisible(page, "restart");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

const idsInGroup = (group: GroupPosition, count: number) =>
  players
    .filter((player) => player.pos === group)
    .slice(0, count)
    .map((player) => player.id);

const SYSTEM_3421 = systems.find((system) => system.id === "3421")!;
const OUTSIDER_3421 = players.find(
  (player) =>
    !detailedPositions(player).some((position) =>
      SYSTEM_3421.fits.includes(position),
    ),
)!;

// Focuses the last strip's compare button the way a keyboard user reaches it: programmatic focus
// (WebKit has no Tab focus on buttons by default), then Tab away and back.
async function focusLastCompare(page: Page): Promise<void> {
  const last = page.locator(".compare-btn").last();
  await last.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  if (!(await last.evaluate((element) => element === document.activeElement)))
    await last.focus();
  await expect(last).toBeFocused();
}

for (const blocked of [false, true])
  test(`the last strip's compare button stays above the bottom dock${blocked ? " when a full squad is blocked" : ""}`, async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    // A full camp squad without goalkeepers is blocked, so the dock headline takes two lines
    // and the bar grows.
    const selectedIds = blocked
      ? [
          ...idsInGroup("OBR", 8),
          ...idsInGroup("POM", 8),
          ...idsInGroup("ATA", 7),
        ]
      : [];
    await seedStorage(
      page,
      campSave({
        selectedIds,
        events: blocked ? ["doctor", "captain", "scout"] : [],
      }),
    );
    await page.goto("/");
    await expect(squadCount(page)).toHaveText(`${selectedIds.length}/23`);
    if (blocked)
      await expect(finalizeButton(page)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    await focusLastCompare(page);
    await expectFocusVisible(
      page,
      blocked ? "last compare button, blocked squad" : "last compare button",
    );
    expect(errors).toEqual([]);
  });

test("start ticket fits a 320 px phone with the stub under the content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  const main = await page.locator(".hero-e-main").boundingBox();
  const stub = await page.locator(".hero-e-stub").boundingBox();
  expect(main).not.toBeNull();
  expect(stub).not.toBeNull();
  expect(stub!.y).toBeGreaterThanOrEqual(main!.y + main!.height - 1);
});

test("start map sits under the formation cards on a phone", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("img", { name: /Mapa pozycji/ });
  await expect(map).toBeVisible();
  const lastCard = await page.locator("label.choice").last().boundingBox();
  const mapBox = await map.boundingBox();
  expect(lastCard).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(mapBox!.y).toBeGreaterThanOrEqual(lastCard!.y + lastCard!.height);
});
