import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadHint() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const hint = (await vite.ssrLoadModule(
    "/src/ui/hint-button.tsx",
  )) as typeof import("./hint-button.tsx");
  return { vite, ...hint };
}

const base = { label: "Zamknij", hint: "Zamknij okno. Nic się nie zmieni." };

test("HintButton describes the button and dismisses on Escape", async () => {
  await withJsdomWindow(async (dom) => {
    const window = dom.window;
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, HintButton } = await loadHint();
    // jsdom may lack PointerEvent; a MouseEvent with the same type name reaches the same listeners.
    // pointerType is set by hand, since the MouseEvent fallback has none.
    const pointer = (type: string, pointerType = "mouse") => {
      const event =
        "PointerEvent" in window
          ? new window.PointerEvent(type)
          : new window.MouseEvent(type);
      Object.defineProperty(event, "pointerType", { value: pointerType });
      return event;
    };
    const escape = (target: Element) => {
      const event = new window.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      fireEvent(target, event);
      return event.defaultPrevented;
    };
    const renderHint = (props: typeof base) => {
      const view = render(
        React.createElement(
          HintButton,
          {
            ...props,
            className: "dlg-close",
            onClick: () => {},
          } as unknown as Parameters<typeof HintButton>[0],
          "X",
        ),
      );
      const button = view.container.querySelector("button")!;
      const tip = view.container.querySelector(".hint-tip")!;
      return { button, tip };
    };

    try {
      await test("the hint is the accessible description and a tooltip", () => {
        const { button, tip } = renderHint(base);
        assert.equal(button.getAttribute("aria-label"), "Zamknij");
        assert.equal(tip.getAttribute("role"), "tooltip");
        assert.equal(button.getAttribute("aria-describedby"), tip.id);
        assert.equal(tip.textContent, "Zamknij okno. Nic się nie zmieni.");
        assert.equal(button.classList.contains("has-hint"), true);
        assert.equal(button.classList.contains("dlg-close"), true);
        cleanup();
      });

      await test("Escape while hovered dismisses the hint and is consumed", () => {
        const { button } = renderHint(base);
        fireEvent(button, pointer("pointerenter"));
        const parentSaw: boolean[] = [];
        const listener = () => parentSaw.push(true);
        window.document.addEventListener("keydown", listener);
        assert.equal(escape(window.document.body), true);
        assert.equal(button.classList.contains("hint-dismissed"), true);
        assert.deepEqual(parentSaw, []);
        window.document.removeEventListener("keydown", listener);

        // leaving restores the hint
        fireEvent(button, pointer("pointerleave"));
        assert.equal(button.classList.contains("hint-dismissed"), false);
        cleanup();
      });

      await test("blurring restores the hint", () => {
        const { button } = renderHint(base);
        fireEvent.focus(button);
        button.focus();
        assert.equal(escape(button), true);
        assert.equal(button.classList.contains("hint-dismissed"), true);
        fireEvent.blur(button);
        button.blur();
        assert.equal(button.classList.contains("hint-dismissed"), false);
        cleanup();
      });

      await test("Escape with the hint not shown passes through", () => {
        const { button } = renderHint(base);
        assert.equal(escape(window.document.body), false);
        assert.equal(button.classList.contains("hint-dismissed"), false);
        cleanup();
      });

      await test("a second Escape after the dismissal passes through", () => {
        const { button } = renderHint(base);
        fireEvent(button, pointer("pointerenter"));
        assert.equal(escape(window.document.body), true);
        assert.equal(escape(window.document.body), false);
        cleanup();
      });

      await test("Escape after a touch pointerenter passes through", () => {
        const { button } = renderHint(base);
        fireEvent(button, pointer("pointerenter", "touch"));
        assert.equal(escape(window.document.body), false);
        assert.equal(button.classList.contains("hint-dismissed"), false);
        cleanup();
      });

      await test("Escape after a hover where hovering is impossible passes through", () => {
        const { button } = renderHint(base);
        const original = window.matchMedia;
        window.matchMedia = ((query: string) => ({
          matches: false,
          media: query,
        })) as unknown as typeof window.matchMedia;
        try {
          fireEvent(button, pointer("pointerenter"));
          assert.equal(escape(window.document.body), false);
        } finally {
          window.matchMedia = original;
        }
        cleanup();
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
