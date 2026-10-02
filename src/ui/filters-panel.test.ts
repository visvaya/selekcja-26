import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import type { GameState, ListFilters } from "../data/types.ts";
import { clearDetailFilters } from "../logic/list-filters.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { LIST_HEADING_ID } from "./list-heading-id.ts";
import { UI_TEXT as text } from "./text.ts";
import { TRAIT_FILTER_ORDER } from "./trait-filter-order.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

function campState(list: Partial<ListFilters> = {}): GameState {
  const state = reduceGameState(createInitialState(7), { type: "start" });
  return { ...state, list: { ...state.list, ...list } };
}

// Renders a stateful harness: the toggle flips `open`, `onList` patches are recorded.
async function renderPanel(state: GameState) {
  const React = await import("react");
  const { render } = await import("@testing-library/react");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const { FiltersPanel } = (await vite.ssrLoadModule(
    "/src/ui/filters-panel.tsx",
  )) as typeof import("./filters-panel.tsx");
  const patches: Partial<ListFilters>[] = [];
  function Harness() {
    const [open, setOpen] = React.useState(false);
    return React.createElement(FiltersPanel, {
      state,
      open,
      onToggle: () => setOpen((value) => !value),
      onList: (patch: Partial<ListFilters>) => patches.push(patch),
    });
  }
  const result = render(React.createElement(Harness));
  return { vite, patches, ...result };
}

async function withPanel(
  state: GameState,
  body: (
    rendered: Awaited<ReturnType<typeof renderPanel>>,
  ) => Promise<void> | void,
) {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const rendered = await renderPanel(state);
    try {
      await body(rendered);
    } finally {
      cleanup();
      await rendered.vite.close();
    }
  });
}

test("the panel is collapsed by default and opens from its toggle", async () => {
  await withPanel(campState(), async ({ getByRole, container }) => {
    const { fireEvent } = await import("@testing-library/react");
    const toggle = getByRole("button", { name: text.detailFilters });
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    const panel = container.querySelector(".filters-panel");
    assert.equal(panel?.hasAttribute("hidden"), true);
    assert.equal(toggle.getAttribute("aria-controls"), panel?.id);
    fireEvent.click(toggle);
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.equal(panel?.hasAttribute("hidden"), false);
  });
});

test("the panel holds foot, traits and ranges fieldsets", async () => {
  await withPanel(campState(), async ({ getByRole, container }) => {
    const { fireEvent, within } = await import("@testing-library/react");
    fireEvent.click(getByRole("button", { name: text.detailFilters }));
    const foot = getByRole("group", { name: text.footLegend });
    assert.equal(within(foot).getAllByRole("checkbox").length, 2);
    assert.ok(foot.textContent?.includes(text.footHint));
    const traits = getByRole("group", { name: text.traitsLegend });
    const labels = within(traits)
      .getAllByRole("checkbox")
      .map((box) => box.closest("label")?.textContent?.trim());
    assert.equal(TRAIT_FILTER_ORDER.length, 22);
    assert.deepEqual(
      labels,
      TRAIT_FILTER_ORDER.map((role) => text.roles[role]),
    );
    assert.equal(labels.includes(text.footLeft), false);
    assert.ok(getByRole("group", { name: text.rangesLegend }));
    const skip = getByRole("link", { name: text.skipToList });
    assert.equal(skip.getAttribute("href"), `#${LIST_HEADING_ID}`);
    assert.ok(container.querySelector(".filters-panel-actions"));
  });
});

test("ticking a box or a trait sends a list patch", async () => {
  await withPanel(campState(), async ({ getByRole, patches }) => {
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(getByRole("button", { name: text.detailFilters }));
    fireEvent.click(getByRole("checkbox", { name: text.footLeft }));
    fireEvent.click(getByRole("checkbox", { name: text.roles.pace }));
    assert.deepEqual(patches, [
      { foot: { left: true, right: false } },
      { traits: ["pace"] },
    ]);
  });
});

test("a second trait is added to the checked ones", async () => {
  await withPanel(
    campState({ traits: ["pace"] }),
    async ({ getByRole, patches }) => {
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.click(getByRole("button", { name: /Filtry szczegółowe/ }));
      fireEvent.click(getByRole("checkbox", { name: text.roles.leader }));
      fireEvent.click(getByRole("checkbox", { name: text.roles.pace }));
      assert.deepEqual(patches, [
        { traits: ["pace", "leader"] },
        { traits: [] },
      ]);
    },
  );
});

test("an applied criterion shows in the toggle name and badge", async () => {
  await withPanel(
    campState({ traits: ["pace"] }),
    async ({ getByRole, container }) => {
      const toggle = getByRole("button", {
        name: text.detailFiltersActive(1),
      });
      const badge = container.querySelector(".filters-count");
      assert.equal(badge?.textContent, "1");
      assert.equal(badge?.getAttribute("aria-hidden"), "true");
      assert.equal(
        toggle.getAttribute("aria-label"),
        "Filtry szczegółowe, aktywne: 1",
      );
    },
  );
});

test("no badge without applied criteria", async () => {
  await withPanel(
    campState({ query: "ki", positions: ["BR"] }),
    ({ container }) => {
      assert.equal(container.querySelector(".filters-count") === null, true);
    },
  );
});

test("Wyczyść filtry clears the detail filters", async () => {
  await withPanel(
    campState({ traits: ["pace"] }),
    async ({ getByRole, patches }) => {
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.click(getByRole("button", { name: /Filtry szczegółowe/ }));
      fireEvent.click(getByRole("button", { name: text.clearFilters }));
      assert.deepEqual(patches, [clearDetailFilters()]);
    },
  );
});
