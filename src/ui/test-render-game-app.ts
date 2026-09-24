import { createServer } from "vite";
import type { JSDOM } from "jsdom";

// Shared by game-app.test.ts's scenarios: boots a Vite middleware server, loads GameApp
// through it (so its own imports resolve the same way the real app does) and renders it
// into the given JSDOM window. The caller owns `vite.close()` and `cleanup()`, since the
// order relative to its own `try`/`finally` differs per test.
export async function renderGameApp(dom: JSDOM) {
  dom.window.scrollTo = () => {};
  const React = await import("react");
  const testingLibrary = await import("@testing-library/react");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  const { GameApp } = (await vite.ssrLoadModule(
    "/src/ui/game-app.tsx",
  )) as typeof import("./game-app.tsx");
  const view = testingLibrary.render(React.createElement(GameApp));
  return { ...testingLibrary, vite, view };
}
