import test from "node:test";
import assert from "node:assert/strict";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { useMediaQuery } from "./use-media-query.ts";

async function renderProbe(defaultMatches: boolean) {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const seen: boolean[] = [];
  function Probe() {
    const matches = useMediaQuery("(min-width: 900px)", defaultMatches);
    seen.push(matches);
    return null;
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(Probe)));
  return { seen, root, act };
}

test("useMediaQuery returns the default when matchMedia is missing", async () => {
  await withJsdomWindow(async () => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    assert.equal(typeof window.matchMedia, "undefined");
    const { seen, root, act } = await renderProbe(true);
    assert.equal(seen.at(-1), true);
    await act(async () => root.unmount());
  });
});

test("useMediaQuery follows change events and removes its listener on unmount", async () => {
  await withJsdomWindow(async (dom) => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const queries: string[] = [];
    let current = true;
    dom.window.matchMedia = ((query: string) => {
      queries.push(query);
      return {
        get matches() {
          return current;
        },
        media: query,
        addEventListener: (
          _type: string,
          listener: (event: { matches: boolean }) => void,
        ) => listeners.add(listener),
        removeEventListener: (
          _type: string,
          listener: (event: { matches: boolean }) => void,
        ) => listeners.delete(listener),
      };
    }) as unknown as typeof dom.window.matchMedia;

    const { seen, root, act } = await renderProbe(false);
    assert.equal(seen.at(-1), true);
    assert.equal(queries.includes("(min-width: 900px)"), true);
    assert.equal(listeners.size, 1);

    await act(async () => {
      current = false;
      for (const listener of listeners) listener({ matches: false });
    });
    assert.equal(seen.at(-1), false);

    await act(async () => root.unmount());
    assert.equal(listeners.size, 0);
  });
});
