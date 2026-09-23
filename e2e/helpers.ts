import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { UI_TEXT as text } from "../src/ui/text.ts";

export { text };

export const STORAGE_KEY = "selekcja-26-game";

export const CAMP_EVENT_CHOICES = [
  text.events.doctor.choices[0]!.title,
  text.events.captain.choices[0]!.title,
  text.events.scout.choices[0]!.title,
] as const;

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

export function dialog(page: Page): Locator {
  return page.getByRole("dialog");
}

export function squadCount(page: Page): Locator {
  return page.locator(".count-ring b");
}

export function finalizeButton(page: Page): Locator {
  return page.locator(".dock .finalize");
}

export function dockToggle(page: Page): Locator {
  return page.locator(".dock .dock-copy");
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function readReport(page: Page) {
  const report = page.locator(".result");
  return {
    stage: await report.locator("h1").innerText(),
    grade: await report.locator(".grade").innerText(),
    matches: await report
      .locator(".report")
      .first()
      .locator("li")
      .allInnerTexts(),
    lastMatch: await report.locator(".report").first().locator("p").innerText(),
  };
}

export async function expectCoherentReport(page: Page): Promise<void> {
  const report = await readReport(page);
  const last = report.lastMatch.replace(text.lastMatch, "").trim();
  expect(report.matches.length).toBeGreaterThanOrEqual(2);
  expect(report.matches.at(-1)).toContain(last);
  expect(Object.values(text.outcomes)).toContain(report.stage);
  const knockoutRounds = report.matches.filter((match) =>
    text.tournament.rounds.some((round) => match.startsWith(`${round}:`)),
  );
  const expectedRounds: Record<string, number> = {
    [text.outcomes.group]: 0,
    [text.outcomes.roundOf16]: 1,
    [text.outcomes.quarterfinal]: 2,
    [text.outcomes.semifinal]: 3,
    [text.outcomes.runnerUp]: 4,
    [text.outcomes.champion]: 4,
  };
  expect(knockoutRounds).toHaveLength(expectedRounds[report.stage]!);
}
