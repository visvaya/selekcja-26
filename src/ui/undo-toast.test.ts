import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { UI_CONFIG } from "./ui-config.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import type { UndoMessage } from "./undo-toast.tsx";

async function withToast(
  body: (
    show: (message: UndoMessage | null) => void,
    container: HTMLElement,
    tick: (ms: number) => Promise<void>,
  ) => Promise<void>,
) {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup, act } = await import("@testing-library/react");
    // `hmr: false` keeps this server off the default HMR port other test files may use.
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const { UndoToast } = (await vite.ssrLoadModule(
        "/src/ui/undo-toast.tsx",
      )) as typeof import("./undo-toast.tsx");
      const { container, rerender } = render(
        React.createElement(UndoToast, { message: null }),
      );
      const show = (message: UndoMessage | null) =>
        rerender(React.createElement(UndoToast, { message }));
      const tick = async (ms: number) => {
        await act(async () => mock.timers.tick(ms));
      };
      await body(show, container, tick);
    } finally {
      mock.timers.reset();
      cleanup();
      await vite.close();
    }
  });
}

const toasts = (container: HTMLElement) =>
  container.querySelectorAll(".undo-toast");
const visible = (container: HTMLElement) =>
  container.querySelector(".undo-toast")?.classList.contains("is-visible") ??
  false;

test("no message renders nothing", async () => {
  await withToast(async (_show, container) => {
    assert.equal(toasts(container).length, 0);
  });
});

test("the message is hidden from assistive tech and lets clicks through", async () => {
  await withToast(async (show, container) => {
    show({ id: 1, text: "Cofnięto powołanie: Jan Nowak." });
    const toast = container.querySelector(".undo-toast");
    assert.equal(toast?.getAttribute("aria-hidden"), "true");
    assert.equal(toast?.textContent, "Cofnięto powołanie: Jan Nowak.");
    assert.equal(visible(container), true);
  });
});

test("the message hides after the timeout", async () => {
  await withToast(async (show, container, tick) => {
    show({ id: 1, text: "Cofnięto zmianę formacji. Formacja: 4-3-3." });
    await tick(UI_CONFIG.undoToastMs - 1);
    assert.equal(visible(container), true);
    await tick(1);
    assert.equal(visible(container), false);
  });
});

test("a second undo replaces the text in one element and restarts the timer", async () => {
  await withToast(async (show, container, tick) => {
    show({ id: 1, text: "Cofnięto powołanie: Jan Nowak." });
    await tick(3000);
    show({ id: 2, text: "Cofnięto odwołanie: Adam Kowal." });
    assert.equal(toasts(container).length, 1);
    assert.equal(
      toasts(container)[0]?.textContent,
      "Cofnięto odwołanie: Adam Kowal.",
    );
    await tick(UI_CONFIG.undoToastMs - 1);
    assert.equal(visible(container), true);
    await tick(1);
    assert.equal(visible(container), false);
  });
});

test("the same text again restarts the timer", async () => {
  await withToast(async (show, container, tick) => {
    show({ id: 1, text: "Cofnięto ostatnią decyzję." });
    await tick(3000);
    show({ id: 2, text: "Cofnięto ostatnią decyzję." });
    await tick(3000);
    assert.equal(visible(container), true);
  });
});

test("clearing the message removes it and its timer", async () => {
  await withToast(async (show, container, tick) => {
    const cleared = mock.method(globalThis, "clearTimeout");
    show({ id: 1, text: "Cofnięto ostatnią decyzję." });
    show(null);
    assert.equal(toasts(container).length, 0);
    assert.ok(cleared.mock.callCount() >= 1);
    cleared.mock.restore();
    await tick(UI_CONFIG.undoToastMs);
  });
});
