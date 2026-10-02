import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, text } from "./helpers.ts";

test.use({ viewport: { width: 320, height: 640 } });

test("strips fit names, clubs and trait rows at 320 px and keep focus on resize", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: text.start }).click();
  await expect(page.locator(".player").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expectNoHorizontalScroll(page);

  // Every trait row keeps its visible tags on one line.
  const rowLines = await page.locator(".player .tags").evaluateAll((rows) =>
    rows.map((row) => {
      const tops = [...row.children]
        .filter((child) => !(child as HTMLElement).hidden)
        .map((child) => (child as HTMLElement).offsetTop);
      return tops.filter(
        (top, index) =>
          tops.findIndex((other) => Math.abs(other - top) <= 2) === index,
      ).length;
    }),
  );
  expect(rowLines.length).toBeGreaterThan(0);
  expect(rowLines.every((lines) => lines <= 1)).toBe(true);

  // The longest catalogue name shows in full or as "initial + surname", never clipped.
  const longest = await page
    .locator(".player h3 .name-trunc")
    .evaluateAll((names) => {
      const fullName = (name: Element) =>
        `${name.getAttribute("data-first")} ${name.getAttribute("data-last")}`;
      const name = names.reduce((best, current) =>
        fullName(current).length > fullName(best).length ? current : best,
      ) as HTMLElement;
      return {
        first: name.getAttribute("data-first") ?? "",
        last: name.getAttribute("data-last") ?? "",
        shown: name.textContent ?? "",
        clipped: name.scrollWidth > name.clientWidth,
      };
    });
  expect([
    `${longest.first} ${longest.last}`,
    `${longest.first.charAt(0)}. ${longest.last}`,
  ]).toContain(longest.shown);
  expect(longest.clipped).toBe(false);

  // A shortened name keeps focus (or hands it to the badge) when it grows back to full.
  const shortened = page.locator(".player h3 button.name-trunc").first();
  await expect(shortened).toBeVisible();
  const stripIndex = await shortened.evaluate((name) =>
    [...document.querySelectorAll(".player")].indexOf(name.closest(".player")!),
  );
  await shortened.focus();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(
    page.locator(".player").nth(stripIndex).locator("h3 .name-trunc"),
  ).not.toHaveText(/^\S\. /);
  const focus = await page.evaluate(() => {
    const active = document.activeElement;
    return {
      onNameOrBadge: active?.matches(".name-trunc, button.pos") ?? false,
      strip: [...document.querySelectorAll(".player")].indexOf(
        active?.closest(".player") as Element,
      ),
    };
  });
  expect(focus).toEqual({ onNameOrBadge: true, strip: stripIndex });
  await expectNoHorizontalScroll(page);
});
