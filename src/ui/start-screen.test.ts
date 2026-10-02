import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import { UI_TEXT } from "./text.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

test("ticket candidate count is pluralised in the genitive", () => {
  assert.ok(UI_TEXT.ticket.candidates(1).endsWith("kandydata."));
  assert.ok(UI_TEXT.ticket.candidates(22).endsWith("kandydatów."));
});

test("StartScreen shows the EURO ticket built from game data", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    // `hmr: false` keeps this server off the default HMR port other test files may use.
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    try {
      const { StartScreen } = (await vite.ssrLoadModule(
        "/src/ui/start-screen.tsx",
      )) as typeof import("./start-screen.tsx");
      const noop = () => {};
      const { container, getByRole, queryByText } = render(
        React.createElement(StartScreen, {
          system: "4231",
          canUndo: false,
          headingRef: React.createRef<HTMLHeadingElement>(),
          onSystem: noop,
          onStart: noop,
          onUndo: noop,
        }),
      );
      assert.ok(getByRole("heading", { level: 1, name: "Bilet na EURO" }));
      const lead = container.querySelector(".start-ticket-lead")?.textContent;
      assert.ok(
        lead?.includes(UI_TEXT.ticket.candidates(players.length)) ?? false,
      );
      assert.ok(lead?.includes("Wybierasz spośród 61 kandydatów.") ?? false);
      const pairs = [...container.querySelectorAll("dl > div")].map(
        (row) => row.querySelector("dd")?.textContent,
      );
      assert.equal(container.querySelectorAll("dl dt").length, 4);
      assert.deepEqual(pairs, [
        String(Object.keys(UI_TEXT.stages).length),
        "Zgrupowanie kontrolne",
        String(GAME_RULES.camp.squadSizePlayers),
        String(GAME_RULES.final.squadSizePlayers),
      ]);
      assert.deepEqual(pairs, ["2", "Zgrupowanie kontrolne", "23", "26"]);
      assert.equal(
        container.querySelector(".hero-e-stub")?.getAttribute("aria-hidden"),
        "true",
      );
      assert.equal(queryByText("Notatka sztabu szkoleniowego") === null, true);
      cleanup();
    } finally {
      await vite.close();
    }
  });
});
