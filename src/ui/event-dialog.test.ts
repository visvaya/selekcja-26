import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { EVENTS } from "../data/events.ts";
import type { CampEvent } from "../data/events.ts";
import type { GameState } from "../data/types.ts";
import { squadQuality } from "../logic/selection.ts";
import { createInitialState } from "../logic/state.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { renderComponent } from "./test-render-game-app.ts";

const base = createInitialState(5);
const state: GameState = {
  ...base,
  selected: new Set(players.slice(0, 9).map((player) => player.id)),
};
const doctor = EVENTS.find((event) => event.id === "doctor")!;
const scout = EVENTS.find((event) => event.id === "scout")!;

async function withEvent(
  event: CampEvent,
  body: (
    panel: HTMLElement,
    calls: { close: number },
    fire: (target: Element, type: string, init?: object) => void,
  ) => void,
): Promise<void> {
  await withJsdomWindow(async () => {
    const calls = { close: 0 };
    const { vite, view, cleanup } = await renderComponent(
      "/src/ui/event-dialog.tsx",
      "EventDialog",
      {
        event,
        state,
        onClose: () => {
          calls.close += 1;
        },
        onChoose: () => {},
        onUndo: () => {},
        restoreFocusFallback: () => {},
      },
    );
    const win = view.baseElement.ownerDocument.defaultView!;
    const fire = (target: Element, type: string, init: object = {}) => {
      const EventType = type === "keydown" ? win.KeyboardEvent : win.MouseEvent;
      target.dispatchEvent(
        new EventType(type, { bubbles: true, cancelable: true, ...init }),
      );
    };
    try {
      body(
        view.baseElement.querySelector<HTMLElement>('[role="dialog"]')!,
        calls,
        fire,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

test("the event explains when it happens and what the squad looks like now", async () => {
  await withEvent(doctor, (panel) => {
    assert.equal(
      panel.querySelector(".event-context")?.textContent,
      "Przy 9 powołaniach sztab zgłasza sprawę do rozstrzygnięcia (1 z 3). Twój wybór wpłynie na ocenę całej kadry.",
    );
    const current = panel.querySelector(".event-current")!;
    const bold = [...current.querySelectorAll("b")].map((b) => b.textContent);
    assert.ok(current.textContent?.startsWith("Obecnie: "));
    assert.equal(bold.length, 2);
    assert.match(bold[0]!, /^Ryzyko urazu (niskie|średnie|wysokie)$/);
    assert.equal(bold[1], `Jakość ${squadQuality(state)}`);
  });
});

test("each choice lists its non-zero effects with a direction", async () => {
  await withEvent(doctor, (panel) => {
    const first = panel.querySelectorAll(".decision")[0]!;
    const chips = [...first.querySelectorAll(".effect")];
    assert.deepEqual(
      chips.map((chip) => chip.textContent),
      ["Ryzyko urazu spada", "Jakość spada"],
    );
    assert.equal(chips[0]!.classList.contains("effect-good"), true);
    assert.equal(chips[1]!.classList.contains("effect-good"), false);
    assert.equal(
      chips[0]!.querySelector("svg")?.getAttribute("aria-hidden"),
      "true",
    );
  });
  await withEvent(scout, (panel) => {
    const second = panel.querySelectorAll(".decision")[1]!;
    assert.deepEqual(
      [...second.querySelectorAll(".effect")].map((chip) => chip.textContent),
      ["Zgranie rośnie"],
    );
  });
});

test("the event is blocking: undo last, no X, no Escape, no scrim", async () => {
  await withEvent(doctor, (panel, calls, fire) => {
    const buttons = [...panel.querySelectorAll("button")];
    const last = buttons.at(-1)!;
    assert.equal(last.textContent, "Cofnij ostatnie powołanie");
    assert.equal(last.classList.contains("event-undo"), true);
    assert.equal(panel.querySelector(".dlg-close"), null);
    fire(panel, "keydown", { key: "Escape" });
    const wrap = panel.closest(".modal-wrap")!;
    fire(wrap, "pointerdown");
    fire(wrap, "click");
    assert.equal(calls.close, 0);
  });
});
