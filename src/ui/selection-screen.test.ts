import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players } from "../data/catalog.ts";
import type { GameState, ListFilters } from "../data/types.ts";
import {
  catalogueCounts,
  DEFAULT_LIST_FILTERS,
  visiblePlayers,
} from "../logic/list-filters.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadSelectionScreen() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const { SelectionScreen } = (await vite.ssrLoadModule(
    "/src/ui/selection-screen.tsx",
  )) as typeof import("./selection-screen.tsx");
  return { vite, SelectionScreen };
}

function campState(): GameState {
  return reduceGameState(createInitialState(7), { type: "start" });
}

function finalState(): GameState {
  return reduceGameState(campState(), {
    type: "completeCamp",
    squad: players.slice(0, 23),
  });
}

function withList(state: GameState, list: Partial<ListFilters>): GameState {
  return { ...state, list: { ...state.list, ...list } };
}

async function renderScreen(
  state: GameState,
  onList: (patch: Partial<ListFilters>) => void = () => {},
) {
  const React = await import("react");
  const { render } = await import("@testing-library/react");
  const { vite, SelectionScreen } = await loadSelectionScreen();
  const noop = () => {};
  const result = render(
    React.createElement(SelectionScreen, {
      state,
      headingRef: React.createRef<HTMLHeadingElement>(),
      onAutoFill: noop,
      onUndo: noop,
      onClearSquad: noop,
      onNewGame: noop,
      undoRef: React.createRef<HTMLButtonElement>(),
      onList,
      onToggle: noop,
      onProfile: noop,
      onCompare: noop,
    }),
  );
  return { vite, ...result };
}

function facts(container: HTMLElement): string[][] {
  return [...container.querySelectorAll("dl.game-facts > div")].map((row) => [
    row.querySelector("dt")?.textContent ?? "",
    row.querySelector("dd")?.textContent ?? "",
  ]);
}

test("camp list head shows the heading, facts, hint and inline KPIs", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const { vite, container, getByRole } = await renderScreen(campState());
    try {
      const heading = getByRole("heading", { level: 1 });
      assert.equal(heading.textContent, "Wybierz 23 zawodników na test");
      const section = container.querySelector("section[aria-labelledby]");
      assert.equal(
        section?.getAttribute("aria-labelledby"),
        heading.getAttribute("id"),
      );
      assert.deepEqual(facts(container), [
        ["Termin", "marzec 2028"],
        ["Formacja", "4–2–3–1"],
      ]);
      assert.ok(
        container
          .querySelector(".game-head > p")
          ?.textContent?.startsWith("To moment na sprawdzenie") ?? false,
      );
      const labels = [
        ...container.querySelectorAll(".kpis.kpis-inline .kpi span"),
      ].map((span) => span.textContent);
      assert.deepEqual(labels, ["Jakość", "Dopasowanie", "Ryzyko zdrowotne"]);
      // phone form in jsdom: no side column
      assert.equal(container.querySelector("aside.dock-side") === null, true);
      const text = container.textContent ?? "";
      assert.equal(text.includes("LISTA KONTROLNA"), false);
      assert.equal(text.includes("MARZEC 2028"), false);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("final list head shows the June term", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const { vite, container } = await renderScreen(finalState());
    try {
      assert.deepEqual(facts(container)[0], ["Termin", "czerwiec 2028"]);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("wide form moves the KPIs and actions into the side column", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const stub = (query: string) =>
      ({
        matches: query === "(min-width: 1024px)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: stub,
    });
    const { vite, container } = await renderScreen(campState());
    try {
      const aside = container.querySelector(".screen-layout > aside.dock-side");
      assert.equal(aside !== null, true);
      assert.equal(aside?.querySelector(".kpis.kpis-side") !== null, true);
      const actions = aside?.querySelector(".game-actions.side-actions");
      assert.equal(
        [...(actions?.querySelectorAll("button") ?? [])]
          .map((button) => button.textContent)
          .join("|"),
        "Cofnij|Dobierz losowo|Odwołaj wszystkich|Nowa gra",
      );
      assert.equal(container.querySelector(".kpis-inline") === null, true);
      assert.equal(container.querySelectorAll(".game-actions").length, 1);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("position chips form a labelled multi-select group with counts", async () => {
  await withJsdomWindow(async () => {
    const { cleanup, fireEvent } = await import("@testing-library/react");
    const patches: Partial<ListFilters>[] = [];
    const { vite, getByRole } = await renderScreen(campState(), (patch) =>
      patches.push(patch),
    );
    try {
      const group = getByRole("group", {
        name: "Filtry pozycyjne (wybrani/dostępni):",
      });
      const chips = [...group.querySelectorAll("button")];
      assert.equal(chips.length, 15);
      const brTotal = catalogueCounts().BR;
      assert.equal(chips[0]?.textContent, "Wszyscy (0/61)");
      assert.equal(
        chips[0]?.getAttribute("aria-label"),
        "Wszyscy (0/61): powołani 0 z 61",
      );
      assert.equal(chips[0]?.getAttribute("aria-pressed"), "true");
      assert.equal(chips[1]?.textContent, `BR (0/${brTotal})`);
      assert.equal(
        chips[1]?.getAttribute("aria-label"),
        `BR (0/${brTotal}): bramkarz, powołani 0 z ${brTotal}`,
      );
      fireEvent.click(chips[1]!);
      assert.deepEqual(patches.at(-1), { positions: ["BR"] });
      fireEvent.click(chips[0]!);
      assert.deepEqual(patches.at(-1), { positions: [] });
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("several chosen positions press their chips and keep the general heading", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const { vite, container, getByRole } = await renderScreen(
      withList(campState(), { positions: ["BR", "N"] }),
    );
    try {
      const pressed = [
        ...container.querySelectorAll('.filters button[aria-pressed="true"]'),
      ].map((chip) => chip.textContent?.split(" ")[0]);
      assert.deepEqual(pressed, ["BR", "N"]);
      assert.equal(
        getByRole("heading", { level: 2 }).textContent,
        "Wszyscy kandydaci",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("list heading shows the count, the sort label and the ticks", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const state = withList(campState(), { positions: ["BR"] });
    const { vite, container, getByRole, getByLabelText, queryByLabelText } =
      await renderScreen(state);
    try {
      assert.equal(
        container.querySelector(".list-count")?.textContent,
        `Widoczni: ${visiblePlayers(state).length} z 61`,
      );
      assert.equal(
        container.querySelector('.list-heading [role="status"]')?.textContent,
        "",
      );
      const sort = getByLabelText("Sortuj:");
      assert.equal(sort.tagName, "SELECT");
      const options = [...sort.querySelectorAll("option")].map(
        (option) => option.textContent,
      );
      assert.equal(options.includes("Forma"), true);
      assert.equal(options.includes("Taktyka"), true);
      const ticks = getByRole("group", { name: "Pokaż tylko" });
      assert.equal(ticks.textContent, "Tylko powołani (0)");
      assert.equal(
        queryByLabelText("Tylko z marcowego zgrupowania (23)") === null,
        true,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("final stage offers the camp tick", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const { vite, getByLabelText } = await renderScreen({
      ...finalState(),
      campSquad: new Set(players.slice(0, 23).map((player) => player.id)),
    });
    try {
      assert.equal(
        getByLabelText("Tylko z marcowego zgrupowania (23)").tagName,
        "INPUT",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("empty list clears every narrowing filter, keeps the sort and focuses search", async () => {
  await withJsdomWindow(async (dom) => {
    const { cleanup, fireEvent } = await import("@testing-library/react");
    const patches: Partial<ListFilters>[] = [];
    const state = withList(campState(), {
      query: "xyz",
      positions: ["BR"],
      traits: ["leader"],
      sort: "name",
    });
    const { vite, container, getByRole } = await renderScreen(state, (patch) =>
      patches.push(patch),
    );
    try {
      const empty = container.querySelector(".noCandidates");
      assert.equal(
        empty?.textContent?.includes("Brak zawodników spełniających kryteria."),
        true,
      );
      assert.equal(
        empty?.textContent?.includes(
          "Wyczyść wyszukiwanie albo filtry, aby zobaczyć więcej kandydatów.",
        ),
        true,
      );
      const clear = [...(empty?.querySelectorAll("button") ?? [])].find(
        (button) => button.textContent === "Wyczyść filtry",
      );
      fireEvent.click(clear!);
      assert.deepEqual(patches.at(-1), {
        ...DEFAULT_LIST_FILTERS,
        sort: "name",
      });
      const search = getByRole("searchbox", { name: "Szukaj zawodnika" });
      assert.equal(dom.window.document.activeElement === search, true);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
