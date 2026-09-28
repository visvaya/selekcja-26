import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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
    if (!request.url().startsWith("http://127.0.0.1:"))
      foreign.push(request.url());
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
});
