import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import type { JSDOM } from "jsdom";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { UI_CONFIG } from "./ui-config.ts";

type DialogModule = typeof import("./game-dialog.tsx");
type Props = Parameters<DialogModule["GameDialog"]>[0];

function stubMedia(dom: JSDOM, dragMatches: boolean) {
  Object.defineProperty(dom.window, "matchMedia", {
    configurable: true,
    value: (query: string) =>
      ({
        matches: dragMatches && query === UI_CONFIG.sheetDragQuery,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  });
}

function pointer(dom: JSDOM, target: Element, type: string, clientY = 0) {
  const event = new dom.window.MouseEvent(type, { bubbles: true, clientY });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "timeStamp", { value: 400 });
  target.dispatchEvent(event);
}

// Renders GameDialog alone; `body` gets the container, a rerender and the close count.
async function withDialog(
  options: { drag?: boolean; opener?: "plain" | "disabled" },
  props: Partial<Props>,
  body: (tools: {
    dom: JSDOM;
    container: HTMLElement;
    rerender: (next: Partial<Props>) => void;
    unmount: () => void;
    closes: () => number;
    fallbacks: () => number;
    opener: HTMLButtonElement;
  }) => Promise<void> | void,
) {
  await withJsdomWindow(async (dom) => {
    stubMedia(dom, options.drag ?? false);
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    const { GameDialog } = (await vite.ssrLoadModule(
      "/src/ui/game-dialog.tsx",
    )) as DialogModule;
    try {
      const doc = dom.window.document;
      const opener = doc.createElement("button");
      opener.textContent = "Otwórz";
      if (options.opener === "disabled")
        opener.setAttribute("aria-disabled", "true");
      doc.body.append(opener);
      opener.focus();
      let closed = 0,
        fellBack = 0;
      const element = (next: Partial<Props>) =>
        React.createElement(GameDialog, {
          title: "Tytuł",
          eyebrow: "Nadtytuł",
          onClose: () => {
            closed += 1;
          },
          restoreFocusFallback: () => {
            fellBack += 1;
          },
          footer: React.createElement(
            React.Fragment,
            null,
            React.createElement("button", { key: "a" }, "Pierwszy"),
            React.createElement("button", { key: "b" }, "Ostatni"),
          ),
          ...props,
          ...next,
        });
      const view = render(element({}));
      await body({
        dom,
        container: view.container,
        rerender: (next) => view.rerender(element(next)),
        unmount: () => view.unmount(),
        closes: () => closed,
        fallbacks: () => fellBack,
        opener,
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

function escape(dom: JSDOM, target: Element) {
  target.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
}

test("the drawer form: labelled panel, X with a hint, handle, footer and heading focus", async () => {
  await withDialog({}, { form: "drawer" }, ({ dom, container }) => {
    const doc = dom.window.document;
    const wrap = doc.querySelector(".modal-wrap.drawer-phone");
    assert.equal(wrap !== null, true);
    const panel = doc.querySelector<HTMLElement>(".modal")!;
    assert.equal(panel.getAttribute("role"), "dialog");
    assert.equal(panel.getAttribute("aria-modal"), "true");
    const heading = doc.getElementById(
      panel.getAttribute("aria-labelledby") ?? "",
    );
    assert.equal(heading?.tagName, "H2");
    assert.equal(heading?.textContent, "Tytuł");
    const eyebrow = panel.querySelector(".eyebrow")!;
    assert.equal(
      Boolean(
        eyebrow.compareDocumentPosition(heading!) &
        dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      true,
    );
    const close = panel.querySelector<HTMLButtonElement>(".dlg-close")!;
    assert.equal(close.getAttribute("aria-label"), "Zamknij");
    const tip = doc.getElementById(close.getAttribute("aria-describedby")!);
    assert.equal(tip?.textContent, "Zamknij okno. Nic się nie zmieni.");
    assert.equal(
      panel.querySelector(".dlg-handle")?.getAttribute("aria-hidden"),
      "true",
    );
    assert.deepEqual(
      [...panel.querySelectorAll(".dlg-footer button")].map(
        (button) => button.textContent,
      ),
      ["Pierwszy", "Ostatni"],
    );
    assert.equal(doc.activeElement === heading, true);
    assert.equal(container.contains(panel), true);
  });
});

test("the plain form: no X or handle, first button focused, alertdialog description", async () => {
  await withDialog(
    {},
    { role: "alertdialog", description: "Opis skutków." },
    ({ dom }) => {
      const doc = dom.window.document;
      assert.equal(doc.querySelector(".dlg-close"), null);
      assert.equal(doc.querySelector(".dlg-handle"), null);
      assert.equal(doc.querySelector(".drawer-phone"), null);
      const panel = doc.querySelector<HTMLElement>(".modal")!;
      assert.equal(panel.getAttribute("role"), "alertdialog");
      const description = doc.getElementById(
        panel.getAttribute("aria-describedby") ?? "",
      );
      assert.equal(description?.tagName, "P");
      assert.equal(description?.textContent, "Opis skutków.");
      assert.equal(doc.activeElement?.textContent, "Pierwszy");
    },
  );
});

test("Escape closes once, never while blocking or already handled", async () => {
  await withDialog({}, {}, ({ dom, closes, rerender }) => {
    const doc = dom.window.document;
    escape(dom, doc.activeElement!);
    assert.equal(closes(), 1);
    rerender({ blocking: true });
    escape(dom, doc.activeElement!);
    assert.equal(closes(), 1);
    rerender({ blocking: false });
    const consume = (event: Event) => event.preventDefault();
    doc.addEventListener("keydown", consume, true);
    escape(dom, doc.activeElement!);
    doc.removeEventListener("keydown", consume, true);
    assert.equal(closes(), 1);
  });
});

test("the scrim closes only the drawer form, and only for a press that started on it", async () => {
  await withDialog({}, { form: "drawer" }, ({ dom, closes }) => {
    const doc = dom.window.document;
    const wrap = doc.querySelector(".modal-wrap")!;
    const panel = doc.querySelector(".modal")!;
    pointer(dom, panel, "pointerdown");
    wrap.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    assert.equal(closes(), 0);
    pointer(dom, wrap, "pointerdown");
    wrap.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    assert.equal(closes(), 1);
  });
  await withDialog({}, {}, ({ dom, closes }) => {
    const wrap = dom.window.document.querySelector(".modal-wrap")!;
    pointer(dom, wrap, "pointerdown");
    wrap.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    assert.equal(closes(), 0);
  });
});

test("a drag on the drawer handle closes only where the drag query matches", async () => {
  for (const drag of [true, false]) {
    await withDialog({ drag }, { form: "drawer" }, ({ dom, closes }) => {
      const doc = dom.window.document;
      const panel = doc.querySelector(".modal")!;
      Object.defineProperty(panel, "offsetHeight", { value: 600 });
      const handle = doc.querySelector(".dlg-handle")!;
      pointer(dom, handle, "pointerdown", 100);
      pointer(dom, handle, "pointermove", 300);
      pointer(dom, handle, "pointerup", 300);
      assert.equal(closes(), drag ? 1 : 0);
    });
  }
});

test("focus enters once per mount and returns to the opener or the fallback", async () => {
  await withDialog(
    {},
    { form: "drawer" },
    ({ dom, rerender, unmount, opener, fallbacks }) => {
      const doc = dom.window.document;
      const last = [...doc.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent === "Ostatni",
      )!;
      last.focus();
      rerender({ title: "Nowy tytuł" });
      assert.equal(doc.activeElement === last, true);
      assert.equal(doc.activeElement === opener, false);
      unmount();
      assert.equal(doc.activeElement === opener, true);
      assert.equal(fallbacks(), 0);
    },
  );
  await withDialog(
    { opener: "disabled" },
    {},
    ({ dom, unmount, opener, fallbacks }) => {
      unmount();
      assert.equal(dom.window.document.activeElement === opener, false);
      assert.equal(fallbacks(), 1);
    },
  );
});

test("Tab cycles inside the panel and skips hidden controls", async () => {
  await withDialog({}, {}, ({ dom }) => {
    const doc = dom.window.document;
    const panel = doc.querySelector<HTMLElement>(".modal")!;
    const hidden = doc.createElement("div");
    hidden.hidden = true;
    hidden.append(doc.createElement("button"));
    panel.prepend(hidden);
    const buttons = [...panel.querySelectorAll<HTMLButtonElement>("button")];
    const last = buttons.find((button) => button.textContent === "Ostatni")!;
    last.focus();
    last.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(doc.activeElement?.textContent, "Pierwszy");
  });
});
