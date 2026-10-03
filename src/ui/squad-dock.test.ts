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
import { boardReason, boardToggleDescription } from "./board-summary.ts";
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
            onToggle: () => {},
            onClose: () => {},
            actions: null,
            toggleRef: React.createRef<HTMLButtonElement>(),
            handleRef: React.createRef<HTMLButtonElement>(),
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
      const toggle = view.container.querySelector("button.phone-dock-toggle")!;
      assert.equal(toggle.getAttribute("aria-expanded"), "false");
      assert.ok(toggle.textContent?.startsWith("Zostało 14 miejsc"));
      assert.equal(
        view.container
          .querySelector(".phone-dock-more")
          ?.hasAttribute("hidden"),
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
      const slots = view.container.querySelector(
        ".phone-dock-body .dock-slots",
      )!;
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
      assert.ok(view.container.querySelector(".phone-dock-body .mini-pitch"));
      assert.ok(
        view.container.querySelector(".phone-dock-body button.pitch-outsiders"),
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

test("SquadDock is a pinned bar that opens a modal sheet", async () => {
  await withJsdomWindow(async (dom) => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, SquadDock } = await loadDock();
    const { GameActions } = (await vite.ssrLoadModule(
      "/src/ui/game-actions.tsx",
    )) as typeof import("./game-actions.tsx");
    try {
      const doc = dom.window.document;
      let closed = 0;
      let toggled = 0;
      const renderDock = (state: GameState, expanded: boolean) =>
        render(
          React.createElement(SquadDock, {
            state,
            expanded,
            onToggle: () => {
              toggled += 1;
            },
            onClose: () => {
              closed += 1;
            },
            onOutsiders: () => {},
            onFinalize: () => {},
            toggleRef: React.createRef<HTMLButtonElement>(),
            handleRef: React.createRef<HTMLButtonElement>(),
            actions: React.createElement(GameActions, {
              canUndo: true,
              canAutoFill: true,
              canClear: true,
              onUndo: () => {},
              onAutoFill: () => {},
              onClear: () => {},
              onNewGame: () => {},
              className: "phone-dock-actions",
            }),
          }),
        );
      const short = boardState("camp", squadOf(2, 7, 0, 0));

      // Closed: a complementary bar with the toggle, the ring and the stage button.
      let view = renderDock(short, false);
      let docks = view.container.querySelectorAll(".phone-dock");
      assert.equal(docks.length, 1);
      let dock = docks[0]!;
      assert.equal(dock.classList.contains("dock"), true);
      assert.equal(dock.getAttribute("role"), "complementary");
      assert.equal(dock.getAttribute("aria-label"), "Twoja kadra");
      let sheet = dock.querySelector(".phone-dock-more")!;
      assert.equal(sheet.hasAttribute("hidden"), true);
      let toggle = dock.querySelector("button.phone-dock-toggle")!;
      assert.equal(toggle.getAttribute("aria-expanded"), "false");
      assert.equal(toggle.getAttribute("aria-controls"), sheet.id);
      assert.ok(sheet.id);
      assert.equal(
        toggle.getAttribute("aria-label"),
        "Zostało 14 miejsc: rozwiń tablicę",
      );
      assert.equal(
        toggle.querySelector(".dock-copy-hint")?.textContent,
        "Dotknij, aby rozwinąć",
      );
      assert.equal(
        doc.getElementById(toggle.getAttribute("aria-describedby") ?? "")
          ?.textContent,
        boardToggleDescription(short),
      );
      assert.equal(
        dock.querySelector(".phone-dock-bar .count-ring b")?.textContent,
        "9/23",
      );
      assert.ok(dock.querySelector(".phone-dock-bar .finalize"));
      const scrim = view.container.querySelector(".phone-dock-scrim")!;
      assert.equal(scrim.getAttribute("aria-hidden"), "true");
      assert.equal(scrim.hasAttribute("hidden"), true);
      fireEvent.click(toggle);
      assert.equal(toggled, 1);
      cleanup();

      // Open: the same element is a modal dialog with the handle and the body.
      view = renderDock(short, true);
      docks = view.container.querySelectorAll(".phone-dock");
      assert.equal(docks.length, 1);
      dock = docks[0]!;
      assert.equal(dock.getAttribute("role"), "dialog");
      assert.equal(dock.getAttribute("aria-modal"), "true");
      assert.equal(dock.getAttribute("aria-label"), "Tablica kadry");
      sheet = dock.querySelector(".phone-dock-more")!;
      assert.equal(sheet.hasAttribute("hidden"), false);
      const handle = dock.querySelector<HTMLButtonElement>(
        ".phone-dock-sheet-head button.phone-dock-handle",
      )!;
      assert.equal(handle.getAttribute("aria-label"), "Zwiń tablicę");
      assert.equal(doc.activeElement === handle, true);
      assert.deepEqual(
        [...dock.querySelector(".phone-dock-body")!.children].map((child) =>
          [...child.classList].find((name) =>
            [
              "phone-dock-kpis",
              "dock-slots",
              "pitch-panel",
              "phone-dock-actions",
            ].includes(name),
          ),
        ),
        ["phone-dock-kpis", "dock-slots", "pitch-panel", "phone-dock-actions"],
      );
      assert.equal(
        dock.querySelectorAll(".phone-dock-actions button").length,
        4,
      );
      toggle = dock.querySelector("button.phone-dock-toggle")!;
      assert.equal(toggle.getAttribute("aria-expanded"), "true");
      assert.ok(toggle.getAttribute("aria-label")?.endsWith("zwiń tablicę"));
      assert.equal(
        toggle.querySelector(".dock-copy-hint")?.textContent,
        "Dotknij, aby zwinąć",
      );
      assert.equal(
        view.container
          .querySelector(".phone-dock-scrim")!
          .hasAttribute("hidden"),
        false,
      );
      fireEvent.keyDown(handle, { key: "Escape" });
      assert.equal(closed, 1);
      assert.equal(doc.activeElement === toggle, true);
      // An Escape another handler already used does not close the sheet.
      handle.addEventListener("keydown", (event) => event.preventDefault());
      fireEvent.keyDown(handle, { key: "Escape" });
      assert.equal(closed, 1);
      fireEvent.click(view.container.querySelector(".phone-dock-scrim")!);
      assert.equal(closed, 2);
      fireEvent.click(handle);
      assert.equal(closed, 3);
      fireEvent.click(toggle);
      assert.equal(closed, 4);
      assert.equal(toggled, 1);
      cleanup();

      // A legal full squad: nothing to describe.
      const ready = boardState(
        "camp",
        squadOf(2, 7, 7, 1).concat(ofGroup("ATA", 7).slice(1)),
      );
      view = renderDock(ready, false);
      assert.equal(
        view.container
          .querySelector("button.phone-dock-toggle")!
          .hasAttribute("aria-describedby"),
        false,
      );
      cleanup();
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

// Motion, drag and the hiding bar: a dock rendered with stubbed media queries.
async function withMotionDock(
  queries: Record<string, boolean>,
  body: (tools: {
    dom: import("jsdom").JSDOM;
    view: { container: HTMLElement; rerender: (expanded: boolean) => void };
    closes: () => number;
  }) => Promise<void> | void,
) {
  await withJsdomWindow(async (dom) => {
    const win = dom.window as unknown as Window & typeof globalThis;
    win.matchMedia = ((query: string) => ({
      matches: queries[query] ?? false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    const { vite, SquadDock } = await loadDock();
    try {
      let closed = 0;
      const state = boardState("camp", squadOf(2, 7, 0, 0));
      const element = (expanded: boolean) =>
        React.createElement(SquadDock, {
          state,
          expanded,
          onToggle: () => {},
          onClose: () => {
            closed += 1;
          },
          onOutsiders: () => {},
          onFinalize: () => {},
          actions: null,
          toggleRef: React.createRef<HTMLButtonElement>(),
          handleRef: React.createRef<HTMLButtonElement>(),
        });
      const rendered = render(element(false));
      await body({
        dom,
        view: {
          container: rendered.container,
          rerender: (expanded) => rendered.rerender(element(expanded)),
        },
        closes: () => closed,
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const DRAG = "(max-width: 767.98px)";

test("with reduced motion the sheet and the scrim show and hide at once", async () => {
  await withMotionDock({ [REDUCED]: true }, ({ view }) => {
    const sheet =
      view.container.querySelector<HTMLElement>(".phone-dock-more")!;
    const scrim =
      view.container.querySelector<HTMLElement>(".phone-dock-scrim")!;
    assert.equal(sheet.hidden, true);
    assert.equal(scrim.hidden, true);
    view.rerender(true);
    assert.equal(sheet.hidden, false);
    assert.equal(scrim.hidden, false);
    assert.equal(scrim.classList.contains("is-visible"), true);
    assert.equal(sheet.style.transform, "");
    view.rerender(false);
    assert.equal(sheet.hidden, true);
    assert.equal(scrim.hidden, true);
    assert.equal(sheet.style.transform, "");
  });
});

test("the sheet slides down and hides on transitionend or the fallback timer", async () => {
  await withMotionDock({}, ({ dom, view }) => {
    test.mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const sheet =
        view.container.querySelector<HTMLElement>(".phone-dock-more")!;
      const scrim =
        view.container.querySelector<HTMLElement>(".phone-dock-scrim")!;
      view.rerender(true);
      assert.equal(sheet.hidden, false);
      view.rerender(false);
      assert.match(sheet.style.transform, /^translateY\(-?\d+(\.\d+)?px\)$/);
      assert.equal(sheet.hidden, false);
      assert.equal(scrim.classList.contains("is-visible"), false);
      const end = new dom.window.Event("transitionend");
      Object.assign(end, { propertyName: "transform" });
      sheet.dispatchEvent(end);
      assert.equal(sheet.hidden, true);
      assert.equal(scrim.hidden, true);
      assert.equal(sheet.style.transform, "");

      // fallback: no transitionend
      view.rerender(true);
      view.rerender(false);
      assert.equal(sheet.hidden, false);
      test.mock.timers.tick(500);
      assert.equal(sheet.hidden, true);

      // reopening during the closing slide continues
      view.rerender(true);
      view.rerender(false);
      view.rerender(true);
      assert.equal(sheet.style.transform, "");
      sheet.dispatchEvent(end);
      test.mock.timers.tick(500);
      assert.equal(sheet.hidden, false);
      assert.equal(scrim.hidden, false);
    } finally {
      test.mock.timers.reset();
    }
  });
});

function pointer(
  dom: import("jsdom").JSDOM,
  target: Element,
  type: string,
  clientY: number,
  timeStamp = 0,
) {
  const event = new dom.window.MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  target.dispatchEvent(event);
}

test("dragging the handle springs back or closes the sheet", async () => {
  await withMotionDock({ [DRAG]: true }, ({ dom, view, closes }) => {
    view.rerender(true);
    const sheet =
      view.container.querySelector<HTMLElement>(".phone-dock-more")!;
    const handle =
      view.container.querySelector<HTMLElement>(".phone-dock-handle")!;
    // jsdom has no layout: a 600 px sheet closes past 160 px
    Object.defineProperty(sheet, "offsetHeight", { value: 600 });
    pointer(dom, handle, "pointerdown", 100);
    assert.equal(sheet.classList.contains("is-dragging"), true);
    pointer(dom, handle, "pointermove", 140);
    assert.equal(sheet.style.transform, "translateY(40px)");
    pointer(dom, handle, "pointerup", 140, 400);
    assert.equal(closes(), 0);
    assert.equal(sheet.style.transform, "");
    assert.equal(sheet.classList.contains("is-dragging"), false);
    handle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    assert.equal(closes(), 0, "the click ending a drag is swallowed");

    pointer(dom, handle, "pointerdown", 100);
    pointer(dom, handle, "pointermove", 300);
    pointer(dom, handle, "pointerup", 300, 400);
    assert.equal(closes(), 1);
  });
});

test("without the drag query a move does not follow the finger", async () => {
  await withMotionDock({}, ({ dom, view }) => {
    view.rerender(true);
    const sheet =
      view.container.querySelector<HTMLElement>(".phone-dock-more")!;
    const handle =
      view.container.querySelector<HTMLElement>(".phone-dock-handle")!;
    pointer(dom, handle, "pointerdown", 100);
    pointer(dom, handle, "pointermove", 300);
    assert.equal(sheet.style.transform, "");
  });
});

test("the closed bar hides while scrolling down and returns on focus", async () => {
  await withMotionDock({}, ({ dom, view }) => {
    const win = dom.window;
    Object.defineProperty(win.document.documentElement, "scrollHeight", {
      configurable: true,
      value: 5000,
    });
    const scrollTo = (y: number) => {
      Object.defineProperty(win, "scrollY", { configurable: true, value: y });
      win.dispatchEvent(new win.Event("scroll"));
    };
    const dock = view.container.querySelector<HTMLElement>(".phone-dock")!;
    for (const y of [0, 50, 100, 150, 200]) scrollTo(y);
    assert.equal(dock.classList.contains("is-away"), true);
    const toggle = dock.querySelector<HTMLElement>(".phone-dock-toggle")!;
    toggle.dispatchEvent(new win.FocusEvent("focusin", { bubbles: true }));
    assert.equal(dock.classList.contains("is-away"), false);

    scrollTo(0);
    view.rerender(true);
    for (const y of [0, 50, 100, 150, 200]) scrollTo(y);
    assert.equal(dock.classList.contains("is-away"), false);
  });
});
