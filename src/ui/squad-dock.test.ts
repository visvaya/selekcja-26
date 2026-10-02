import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players, systems } from "../data/catalog.ts";
import type {
  GameState,
  GroupPosition,
  Player,
  Stage,
  SystemId,
} from "../data/types.ts";
import { detailedPositions } from "../logic/selection.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { boardReason } from "./board-summary.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadDock() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const dock = (await vite.ssrLoadModule(
    "/src/ui/squad-dock.tsx",
  )) as typeof import("./squad-dock.tsx");
  return { vite, ...dock };
}

function boardState(
  stage: Stage,
  squad: readonly Player[],
  system: SystemId = "4231",
): GameState {
  const started = reduceGameState(
    reduceGameState(createInitialState(7), {
      type: "setSystem",
      value: system,
    }),
    { type: "start" },
  );
  return {
    ...started,
    stage,
    selected: new Set(squad.map((player) => player.id)),
  };
}

function pick(count: number, predicate: (player: Player) => boolean): Player[] {
  const found = players.filter(predicate).slice(0, count);
  assert.equal(found.length, count, "catalogue has enough players");
  return found;
}

const ofGroup = (group: GroupPosition, count: number) =>
  pick(count, (player) => player.pos === group);

const squadOf = (br: number, obr: number, pom: number, ata: number) => [
  ...ofGroup("BR", br),
  ...ofGroup("OBR", obr),
  ...ofGroup("POM", pom),
  ...ofGroup("ATA", ata),
];

const fitsSystem = (player: Player, system: SystemId): boolean => {
  const fits = systems.find((candidate) => candidate.id === system)!.fits;
  return detailedPositions(player).some((position) => fits.includes(position));
};

// Task 2's 3-4-2-1 state: five forwards with no position in the system.
function outsidersState(): GameState {
  const system = "3421";
  return boardState(
    "camp",
    [
      ...ofGroup("BR", 2),
      ...pick(3, (p) => p.pos === "OBR" && fitsSystem(p, system)),
      ...pick(3, (p) => p.pos === "POM" && fitsSystem(p, system)),
      ...pick(1, (p) => p.pos === "ATA" && detailedPositions(p).includes("N")),
      ...pick(5, (p) => p.pos === "ATA" && !fitsSystem(p, system)),
    ],
    system,
  );
}

test("SquadDock renders the board anatomy and a stage button with a reason", async () => {
  await withJsdomWindow(async (dom) => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, SquadDock } = await loadDock();
    try {
      let finalized = 0;
      const renderDock = (state: GameState, expanded = false) =>
        render(
          React.createElement(SquadDock, {
            state,
            expanded,
            onExpand: () => {},
            onOutsiders: () => {},
            onFinalize: () => {
              finalized += 1;
            },
          }),
        );
      const describedText = (button: Element) =>
        dom.window.document.getElementById(
          button.getAttribute("aria-describedby") ?? "",
        )?.textContent;

      // Short squad: the ring, the collapsed toggle and the blocked stage button.
      const short = boardState("camp", squadOf(2, 7, 0, 0));
      let view = renderDock(short);
      const ring = view.container.querySelector(".count-ring");
      assert.equal(ring?.querySelector("b")?.textContent, "9/23");
      assert.equal(
        (ring as HTMLElement).style.getPropertyValue("--progress"),
        "39",
      );
      const toggle = view.container.querySelector("button.dock-copy")!;
      assert.equal(toggle.getAttribute("aria-expanded"), "false");
      assert.ok(toggle.textContent?.startsWith("Zostało 14 miejsc"));
      assert.equal(
        view.container.querySelector("#dockBreakdown")?.hasAttribute("hidden"),
        true,
      );
      let finalize = view.container.querySelector(".finalize")!;
      assert.equal(finalize.getAttribute("aria-disabled"), "true");
      assert.equal(finalize.hasAttribute("disabled"), false);
      assert.equal(describedText(finalize), boardReason(short));
      fireEvent.click(finalize);
      assert.equal(finalized, 0);
      assert.equal(
        view.container.querySelector('[role="status"]')?.textContent,
        "",
      );
      cleanup();

      // 3-4-2-1 with outsiders: groups, pitch, magnets and the outside marker.
      view = renderDock(outsidersState(), true);
      const slots = view.container.querySelector("#dockBreakdown .dock-slots")!;
      assert.equal(slots.getAttribute("aria-hidden"), "true");
      assert.deepEqual(
        [...slots.querySelectorAll(".dock-slot-group")].map(
          (group) => group.className,
        ),
        ["gk", "def", "mid", "fwd", "free"].map(
          (id) => `dock-slot-group dock-slot-group-${id}`,
        ),
      );
      assert.deepEqual(
        [
          ...slots.querySelectorAll(
            ".dock-slot-group > .dock-slot-group-label",
          ),
        ].map((label) => label.textContent),
        ["BR 2/2", "OBR 3/7", "POM 3/7", "NAP 6 (min. 3)", "Dowolne 3/4"],
      );
      assert.equal(
        slots.querySelectorAll(".dock-slot-group-free span.outside.fill-fwd")
          .length,
        3,
      );
      assert.ok(view.container.querySelector("#dockBreakdown .mini-pitch"));
      assert.ok(
        view.container.querySelector("#dockBreakdown button.pitch-outsiders"),
      );
      const marker = slots.querySelector(".dock-outside-marker")!;
      assert.equal(
        marker.querySelector(".dock-slot-group-label")?.textContent,
        "W tym poza ustawieniem: 5",
      );
      assert.equal(
        marker.querySelector(".dock-outside-detail")?.textContent,
        "5 napastników",
      );
      cleanup();

      // Full final squad with four goalkeepers: excess square, marker and status.
      const blocked = boardState("final", squadOf(4, 7, 8, 7));
      view = renderDock(blocked, true);
      assert.equal(
        view.container.querySelector(
          ".dock-slot-group-gk .dock-slot-group-label",
        )?.textContent,
        "BR 4/3",
      );
      assert.equal(
        view.container.querySelectorAll(".dock-slot-group-gk span.excess")
          .length,
        1,
      );
      assert.equal(
        view.container.querySelector(
          ".dock-excess-marker .dock-slot-group-label",
        )?.textContent,
        "W tym ponad limit: 1",
      );
      finalize = view.container.querySelector(".finalize")!;
      assert.equal(finalize.getAttribute("aria-disabled"), "true");
      assert.equal(
        view.container.querySelector('[role="status"]')?.textContent,
        boardReason(blocked),
      );
      fireEvent.click(finalize);
      assert.equal(finalized, 0);
      cleanup();

      // A legal full squad: the button is active and calls onFinalize once.
      const ready = boardState(
        "camp",
        squadOf(2, 7, 7, 1).concat(ofGroup("ATA", 7).slice(1)),
      );
      view = renderDock(ready);
      finalize = view.container.querySelector(".finalize")!;
      assert.equal(finalize.hasAttribute("aria-disabled"), false);
      fireEvent.click(finalize);
      assert.equal(finalized, 1);
      assert.equal(
        view.container.querySelector('[role="status"]')?.textContent,
        "",
      );
      cleanup();
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
