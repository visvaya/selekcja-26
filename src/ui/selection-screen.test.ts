import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players } from "../data/catalog.ts";
import type { GameState } from "../data/types.ts";
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

async function renderScreen(state: GameState) {
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
      onQuery: noop,
      onFilter: noop,
      onSort: noop,
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
