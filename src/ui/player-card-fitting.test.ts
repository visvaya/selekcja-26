import test from "node:test";
import assert from "node:assert/strict";
import type { JSDOM } from "jsdom";
import { createServer } from "vite";
import type { GameState, Player } from "../data/types.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { campState, finalState, player } from "./test-strip-states.ts";

// Stub layout: a name or probe is 10 px per character, the heading has a fixed width; a tag
// is 8 px per character plus 8 px and wraps at the row width, 20 px per line.
const NAME_CHAR_PX = 10;
const TAG_CHAR_PX = 8;
const TAG_PAD_PX = 8;
const LINE_PX = 20;

function stubLayout(
  dom: JSDOM,
  { headingPx, rowPx }: { headingPx: number; rowPx: number },
) {
  const proto = dom.window.HTMLElement.prototype;
  const rect = (width: number) =>
    ({
      width,
      height: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: 0,
      x: 0,
      y: 0,
    }) as DOMRect;
  Object.defineProperty(proto, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      if (this.tagName === "H3") return rect(headingPx);
      if (this.classList.contains("name-trunc"))
        return rect((this.textContent ?? "").length * NAME_CHAR_PX);
      return rect(0);
    },
  });
  Object.defineProperty(proto, "offsetTop", {
    configurable: true,
    get(this: HTMLElement) {
      const row = this.parentElement;
      if (!row?.classList.contains("tags")) return 0;
      let line = 0;
      let used = 0;
      for (const child of row.children) {
        if ((child as HTMLElement).hidden) continue;
        const width =
          (child.textContent ?? "").length * TAG_CHAR_PX + TAG_PAD_PX;
        if (used > 0 && used + width > rowPx) {
          line += 1;
          used = 0;
        }
        used += width;
        if (child === this) return line * LINE_PX;
      }
      return 0;
    },
  });
}

async function renderCard(target: Player, state: GameState) {
  const React = await import("react");
  const { render } = await import("@testing-library/react");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const card = (await vite.ssrLoadModule(
    "/src/ui/player-card.tsx",
  )) as typeof import("./player-card.tsx");
  const noop = () => {};
  const result = render(
    React.createElement(card.PlayerCard, {
      player: target,
      state,
      onToggle: noop,
      onProfile: noop,
      onCompare: noop,
    }),
  );
  return { vite, ...result };
}

test("a long name becomes an initial and a surname with a popover", async () => {
  await withJsdomWindow(async (dom) => {
    stubLayout(dom, { headingPx: 120, rowPx: 1000 });
    const { cleanup } = await import("@testing-library/react");
    const { vite, container } = await renderCard(
      player("piotr-zielinski"),
      campState(),
    );
    try {
      const button = container.querySelector<HTMLButtonElement>(
        "h3 button.name-trunc",
      );
      assert.ok(button);
      assert.equal(button.textContent, "P. Zieliński");
      assert.equal(
        button.getAttribute("aria-label"),
        "P. Zieliński (Piotr Zieliński)",
      );
      assert.equal(button.getAttribute("data-first"), "Piotr");
      const popover = container.ownerDocument.getElementById(
        button.getAttribute("popovertarget") ?? "",
      );
      assert.equal(popover?.hasAttribute("popover"), true);
      assert.equal(popover?.textContent, "Piotr Zieliński");
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("a fitting name stays plain text", async () => {
  await withJsdomWindow(async (dom) => {
    stubLayout(dom, { headingPx: 300, rowPx: 1000 });
    const { cleanup } = await import("@testing-library/react");
    const { vite, container } = await renderCard(
      player("piotr-zielinski"),
      campState(),
    );
    try {
      assert.equal(container.querySelector("h3 button") === null, true);
      assert.equal(
        container.querySelector("h3 .name-trunc")?.textContent,
        "Piotr Zieliński",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("an overflowing trait row hides tags behind +N and opens with Zwiń", async () => {
  await withJsdomWindow(async (dom) => {
    stubLayout(dom, { headingPx: 1000, rowPx: 300 });
    const { cleanup, fireEvent } = await import("@testing-library/react");
    const flagged = player("pawel-dawidowicz");
    const { vite, container } = await renderCard(
      flagged,
      finalState({ [flagged.id]: { delta: 2, note: "impressed" } }),
    );
    try {
      const visible = () =>
        [
          ...container.querySelectorAll<HTMLElement>(
            ".tags .tag:not(.tag-more)",
          ),
        ]
          .filter((tag) => !tag.hidden)
          .map((tag) => tag.textContent ?? "");
      assert.equal(visible().length, 1);
      assert.equal(visible()[0]?.startsWith("Zgrupowanie:"), true);
      const more = container.querySelector<HTMLButtonElement>(
        ".tags button.tag-more",
      );
      assert.ok(more);
      assert.equal(more.hidden, false);
      assert.equal(more.textContent, "+3");
      assert.equal(
        more.getAttribute("aria-label"),
        "+3: pokaż jeszcze 3 cechy, w tym ostrzeżenie",
      );
      assert.equal(more.getAttribute("aria-expanded"), "false");
      assert.equal(more.classList.contains("tag-more-alert"), true);
      fireEvent.click(more);
      assert.equal(visible().length, 4);
      assert.equal(more.textContent, "Zwiń");
      assert.equal(more.getAttribute("aria-label"), "Zwiń cechy");
      assert.equal(more.getAttribute("aria-expanded"), "true");
      fireEvent.click(more);
      assert.equal(visible().length, 1);
      assert.equal(more.getAttribute("aria-expanded"), "false");
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("a trait row on one line has no +N", async () => {
  await withJsdomWindow(async (dom) => {
    stubLayout(dom, { headingPx: 1000, rowPx: 2000 });
    const { cleanup } = await import("@testing-library/react");
    const flagged = player("pawel-dawidowicz");
    const { vite, container } = await renderCard(
      flagged,
      finalState({ [flagged.id]: { delta: 2, note: "impressed" } }),
    );
    try {
      const more = container.querySelector<HTMLElement>(".tags .tag-more");
      assert.equal(more?.hidden ?? true, true);
      assert.equal(
        container.querySelectorAll(".tags .tag:not(.tag-more):not([hidden])")
          .length,
        4,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
