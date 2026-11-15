import { expect, test } from "@playwright/test";
import type { CDPSession, Page } from "@playwright/test";
import {
  collectPageErrors,
  dialog,
  finalizeButton,
  squadCount,
  text,
} from "./helpers.ts";

// What the page holds after many full games without a reload: a screen or dialog that leaves
// listeners, nodes or memory behind each time it opens shows as growth between two samples
// taken on the start screen. Chromium only, because the samples come from the DevTools protocol.

const WARM_UP_CYCLES = 2;
const MEASURED_CYCLES = 10;
const BYTES_PER_KIB = 1024;

// Measured on the production build in Chromium, three local runs of ten cycles after two to warm
// up: 170 listeners and 403 nodes before and after every time, so one left behind per cycle would
// show as ten. Heap growth was 570, 579 and 576 KiB, and 1091 KiB over thirty cycles, so it
// levels off; 100 KiB kept per cycle would cross the budget.
const BUDGET = {
  eventListenerGrowth: 0,
  nodeGrowth: 0,
  heapGrowthKib: 1500,
};

type MemorySample = {
  heapUsedKib: number;
  eventListeners: number;
  nodes: number;
  documents: number;
};

async function memorySample(session: CDPSession): Promise<MemorySample> {
  await session.send("HeapProfiler.collectGarbage");
  const heap = await session.send("Runtime.getHeapUsage");
  const { metrics } = await session.send("Performance.getMetrics");
  const metric = (name: string): number => {
    const found = metrics.find((candidate) => candidate.name === name);
    if (found === undefined)
      throw new Error(`The browser reports no metric named ${name}`);
    return found.value;
  };
  return {
    heapUsedKib: Math.round(heap.usedSize / BYTES_PER_KIB),
    eventListeners: metric("JSEventListeners"),
    nodes: metric("Nodes"),
    documents: metric("Documents"),
  };
}

async function closeDrawer(page: Page): Promise<void> {
  await dialog(page).getByRole("button", { name: text.closeDialog }).click();
  await expect(dialog(page)).toBeHidden();
}

// One full game from the start screen back to it: profile and comparison in the camp, a random
// fill through the three event dialogs, the camp report, a random fill of the final squad, the
// tournament report, a cancelled and then a confirmed restart.
async function cycle(page: Page): Promise<void> {
  await page.getByRole("button", { name: text.start }).click();
  await expect(
    page.getByRole("heading", { name: text.stages.camp.heading }),
  ).toBeVisible();

  const profiles = page.getByRole("button", {
    name: new RegExp(`^${text.profile}: `),
  });
  await profiles.first().click();
  await expect(dialog(page)).toBeVisible();
  await closeDrawer(page);
  const compare = page.locator(".compare-btn");
  await compare.nth(0).click();
  await compare.nth(1).click();
  await expect(dialog(page)).toHaveAccessibleName(text.comparisonEyebrow);
  await closeDrawer(page);

  await page.getByRole("button", { name: text.autoFill }).click();
  for (const event of Object.values(text.events)) {
    await expect(dialog(page)).toHaveAccessibleName(event.title);
    await dialog(page)
      .getByRole("button", { name: new RegExp(event.choices[0]!.title) })
      .click();
  }
  await expect(squadCount(page)).toHaveText("23/23");
  await finalizeButton(page).click();
  await expect(dialog(page)).toHaveAccessibleName(text.campReportTitle);
  await dialog(page)
    .getByRole("button", { name: text.continueToFinal })
    .click();

  await page.getByRole("button", { name: text.autoFill }).click();
  await expect(squadCount(page)).toHaveText("26/26");
  await finalizeButton(page).click();
  await expect(
    page.getByRole("heading", { name: text.tournamentProgress }),
  ).toBeVisible();

  const restart = page.getByRole("button", { name: text.restart });
  await restart.click();
  await dialog(page)
    .getByRole("button", { name: text.confirmRestart.cancel })
    .click();
  await expect(dialog(page)).toBeHidden();
  await restart.click();
  await dialog(page)
    .getByRole("button", { name: text.confirmRestart.confirm })
    .click();
  await expect(
    page.getByRole("heading", { name: text.ticket.title }),
  ).toBeVisible();
}

test("full games without a reload leave no listeners or nodes behind and the heap within its budget", async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const errors = collectPageErrors(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await page.goto("/");
  for (let index = 0; index < WARM_UP_CYCLES; index++) await cycle(page);

  const before = await memorySample(session);
  for (let index = 0; index < MEASURED_CYCLES; index++) await cycle(page);
  const after = await memorySample(session);

  const growth = {
    heapUsedKib: after.heapUsedKib - before.heapUsedKib,
    eventListeners: after.eventListeners - before.eventListeners,
    nodes: after.nodes - before.nodes,
    documents: after.documents - before.documents,
  };
  await testInfo.attach("leak-cycles.json", {
    body: JSON.stringify({ before, after, growth }, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  expect(growth.documents, "documents added by the cycles").toBe(0);
  expect(
    growth.eventListeners,
    "event listeners added by the cycles",
  ).toBeLessThanOrEqual(BUDGET.eventListenerGrowth);
  expect(growth.nodes, "nodes added by the cycles").toBeLessThanOrEqual(
    BUDGET.nodeGrowth,
  );
  expect(growth.heapUsedKib, "heap growth over the cycles").toBeLessThanOrEqual(
    BUDGET.heapGrowthKib,
  );
});
