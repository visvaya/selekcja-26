import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players } from "../data/catalog.ts";
import type { GameState, Player, Stage } from "../data/types.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { boardHeadline, boardReason } from "./board-summary.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadSideBoard() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const board = (await vite.ssrLoadModule(
    "/src/ui/side-board.tsx",
  )) as typeof import("./side-board.tsx");
  return { vite, ...board };
}

function boardState(stage: Stage, squad: readonly Player[]): GameState {
  const started = reduceGameState(createInitialState(7), { type: "start" });
  return {
    ...started,
    stage,
    selected: new Set(squad.map((player) => player.id)),
  };
}

const goalkeepers = (count: number) =>
  players.filter((player) => player.pos === "BR").slice(0, count);

test("SideBoard is a named, focusable region that never collapses", async () => {
  await withJsdomWindow(async (dom) => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, SideBoard } = await loadSideBoard();
    try {
      let finalized = 0;
      const renderBoard = (state: GameState) =>
        render(
          React.createElement(SideBoard, {
            state,
            onOutsiders: () => {},
            onFinalize: () => {
              finalized += 1;
            },
          }),
        );

      const camp = boardState("camp", goalkeepers(2));
      let view = renderBoard(camp);
      const region = view.getByRole("region", {
        name: "Tablica kadry – zgrupowanie",
      });
      assert.equal(region.tagName, "DIV");
      assert.equal(region.classList.contains("dock"), true);
      assert.equal(region.getAttribute("tabindex"), "0");
      assert.equal(region.querySelector("button.dock-copy") === null, true);
      assert.equal(region.querySelector("[aria-expanded]") === null, true);
      const copy = region.querySelector(".dock-inner > div.dock-copy");
      assert.equal(copy?.querySelector("b")?.textContent, boardHeadline(camp));
      assert.equal(copy?.querySelector("small") === null, true);
      assert.equal(
        region.querySelector(".dock-inner .count-ring b")?.textContent,
        "2/23",
      );
      assert.ok(region.querySelector(".dock-inner .dock-slots"));
      assert.ok(region.querySelector(".dock-breakdown .mini-pitch"));
      assert.equal(
        region.querySelector(".dock-breakdown")?.hasAttribute("hidden"),
        false,
      );
      const finalize = region.querySelector(".dock-inner .finalize")!;
      assert.equal(finalize.getAttribute("aria-disabled"), "true");
      assert.equal(
        dom.window.document.getElementById(
          finalize.getAttribute("aria-describedby") ?? "",
        )?.textContent,
        boardReason(camp),
      );
      fireEvent.click(finalize);
      assert.equal(finalized, 0);
      cleanup();

      view = renderBoard(boardState("final", goalkeepers(3)));
      assert.ok(
        view.getByRole("region", { name: "Tablica kadry – kadra turniejowa" }),
      );
      cleanup();
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
