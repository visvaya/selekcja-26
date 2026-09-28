import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { players } from "../src/data/catalog.ts";
import { RULES_REVISION } from "../src/data/constants.ts";
import {
  campSave,
  expectNoHorizontalScroll,
  finishedReportSave,
  seedStorage,
  text,
} from "./helpers.ts";

const DISPLAY = "Pathway Extreme Variable";
const BODY = "Commissioner Variable";
const POLISH = "ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż";

// Renders the Polish alphabet in both families at the weights the game uses, so the browser
// has to fetch the latin-ext faces, then waits for every pending font load to settle.
async function renderSamples(page: Page): Promise<void> {
  await page.evaluate(
    ({ display, body, polish }) => {
      const samples = [
        [display, "700"],
        [display, "900"],
        [body, "400"],
        [body, "700"],
      ] as const;
      for (const [family, weight] of samples) {
        const span = document.createElement("span");
        span.textContent = polish;
        span.style.setProperty("font-family", `"${family}"`);
        span.style.setProperty("font-weight", weight);
        document.body.append(span);
      }
    },
    { display: DISPLAY, body: BODY, polish: POLISH },
  );
  await page.evaluate(() => document.fonts.ready);
}

// Every loaded FontFace of one family, with its unicode-range and weight range.
async function loadedFaces(page: Page, family: string) {
  return page.evaluate(
    (name) =>
      [...document.fonts]
        .filter((face) => face.family.replaceAll('"', "") === name)
        .filter((face) => face.status === "loaded")
        .map((face) => ({ range: face.unicodeRange, weight: face.weight })),
    family,
  );
}

test("both families load their latin and latin-ext faces from the build", async ({
  page,
}) => {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    // data: and blob: URLs never leave the browser; only http(s) requests can.
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:"))
      foreign.push(url);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await renderSamples(page);

  for (const family of [DISPLAY, BODY]) {
    const faces = await loadedFaces(page, family);
    // WebKit serialises the hex digits in lower case, Chromium in upper case.
    // latin-ext carries U+0100-02BA (Ł, Ś, Ź, Ż, ą, ę ...); latin carries U+0000-00FF (Ó, ó).
    expect(
      faces.some((face) => face.range.toUpperCase().includes("U+100-2BA")),
      `${family} latin-ext`,
    ).toBe(true);
    expect(
      faces.some((face) => face.range.toUpperCase().includes("U+0-FF")),
      `${family} latin`,
    ).toBe(true);
    // The variable axis covers every weight the old stylesheet uses (up to 900).
    expect(faces.every((face) => face.weight === "100 900")).toBe(true);
  }
  expect(
    await page.evaluate(
      ([display, polish]) =>
        document.fonts.check(`700 20px "${display}"`, polish),
      [DISPLAY, POLISH],
    ),
  ).toBe(true);
  expect(foreign, "no font or asset request leaves the preview origin").toEqual(
    [],
  );
});

test("body text uses the new family", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "font-family",
    /Commissioner Variable/,
  );
  await expect(heading).toHaveCSS("font-family", /Pathway Extreme Variable/);
});

test.describe("the wider display face fits a 320 px screen", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("start", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expectNoHorizontalScroll(page);
  });

  test("camp list", async ({ page }) => {
    await seedStorage(
      page,
      campSave({
        selectedIds: players.slice(0, 10).map((player) => player.id),
        events: ["doctor"],
      }),
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: text.stages.camp.heading }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expectNoHorizontalScroll(page);
  });

  test("report", async ({ page }) => {
    await seedStorage(page, finishedReportSave(RULES_REVISION));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: text.outcomes.roundOf16 }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expectNoHorizontalScroll(page);
  });
});

// Width of the same sample in the web font and in its fallback face, at the weight each
// fallback was measured for. Chromium only: the local faces resolve to Arial on Windows and
// to the metric-compatible Liberation Sans on the Linux CI runner.
test("fallback faces take about the width of the web fonts", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "local() fallback measured in Chromium",
  );
  await page.goto("/");
  const sample =
    "Wybierz 26 zawodników: Łukasz Skorupski, Piotr Zieliński, Sebastian Szymański";
  const pairs = [
    ["Pathway Extreme Fallback", "Pathway Extreme Variable", "700"],
    ["Commissioner Fallback", "Commissioner Variable", "400"],
    ["Commissioner Fallback", "Commissioner Variable", "700"],
  ] as const;
  const measured = await page.evaluate(
    async ({ line, faces: checked }) => {
      // Load both sides explicitly, so neither width is taken in the browser default font.
      for (const [fallback, web, weight] of checked) {
        await document.fonts.load(`${weight} 20px "${web}"`, line);
        await document.fonts.load(`${weight} 20px "${fallback}"`, line);
      }
      // Status of every fallback face; a machine without Arial or Liberation Sans reports
      // "error" here instead of passing on the default font.
      const faces = [...document.fonts]
        .filter((face) => face.family.replaceAll('"', "").endsWith("Fallback"))
        .map(
          (face) =>
            `${face.family.replaceAll('"', "")} ${face.weight} ${face.status}`,
        );
      const width = (family: string, weight: string) => {
        const span = document.createElement("span");
        span.textContent = line;
        span.style.setProperty("font-family", `"${family}"`);
        span.style.setProperty("font-weight", weight);
        span.style.setProperty("font-size", "20px");
        span.style.setProperty("white-space", "nowrap");
        document.body.append(span);
        const result = span.getBoundingClientRect().width;
        span.remove();
        return result;
      };
      const ratios = checked.map(
        ([fallback, web, weight]) =>
          width(fallback, weight) / width(web, weight),
      );
      return { faces, ratios };
    },
    { line: sample, faces: pairs },
  );
  expect(measured.faces.sort()).toEqual([
    "Commissioner Fallback 400 loaded",
    "Commissioner Fallback 600 900 loaded",
    "Pathway Extreme Fallback 700 loaded",
  ]);
  for (const [index, ratio] of measured.ratios.entries()) {
    const [fallback, , weight] = pairs[index]!;
    expect(ratio, `${fallback} ${weight}`).toBeGreaterThan(0.97);
    expect(ratio, `${fallback} ${weight}`).toBeLessThan(1.03);
  }
});
