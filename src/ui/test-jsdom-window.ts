import { JSDOM } from "jsdom";

const GLOBAL_KEYS = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Node",
] as const;

// Shared by game-app.test.ts and save-status-banner.test.ts: installs a fresh JSDOM window as
// the global `window`/`document`/etc. for the duration of `body`, then restores whatever was
// there before and closes the JSDOM window. Vite server creation/closing and
// @testing-library/react's `cleanup()` stay with each caller, since those differ per test.
export async function withJsdomWindow<T>(
  body: (dom: JSDOM) => Promise<T>,
): Promise<T> {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.test",
  });
  const previous: PropertyDescriptor[] = GLOBAL_KEYS.map(
    (key) =>
      Object.getOwnPropertyDescriptor(globalThis, key) ?? {
        configurable: true,
        value: undefined,
      },
  );
  for (const key of GLOBAL_KEYS) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === "window" ? dom.window : dom.window[key],
    });
  }
  try {
    return await body(dom);
  } finally {
    // React's scheduler runs deferred work (such as a passive-effect flush that reads
    // `window.event`) in a later setImmediate task. Let queued tasks run while the JSDOM globals
    // still exist, or they fail after the test ends with `window` already restored to undefined.
    await new Promise((resolve) => setImmediate(resolve));
    for (const [index, key] of GLOBAL_KEYS.entries()) {
      Object.defineProperty(globalThis, key, previous[index]!);
    }
    dom.window.close();
  }
}
