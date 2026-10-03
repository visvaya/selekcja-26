import { createServer } from "vite";
import { createElement, type FunctionComponent } from "react";
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

// Opens the phone board sheet through its toggle and waits until it reports open.
export async function openBoard(view: { container: HTMLElement }) {
  const { fireEvent, waitFor } = await import("@testing-library/react");
  const toggle = view.container.querySelector<HTMLButtonElement>(
    ".phone-dock .phone-dock-toggle",
  );
  if (!toggle) throw new Error("The phone board toggle is not rendered");
  if (toggle.getAttribute("aria-expanded") !== "true") fireEvent.click(toggle);
  await waitFor(() => {
    if (toggle.getAttribute("aria-expanded") !== "true")
      throw new Error("The phone board sheet did not open");
  });
}

// Renders one exported component of a UI module alone, loaded through Vite like GameApp.
// The caller owns `vite.close()` and `cleanup()`.
export async function renderComponent<P extends object>(
  path: string,
  exportName: string,
  props: P,
) {
  const testingLibrary = await import("@testing-library/react");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const loaded: Record<string, FunctionComponent<P>> = await vite.ssrLoadModule(
    path,
  );
  const component = loaded[exportName]!;
  const view = testingLibrary.render(createElement(component, props));
  const { cleanup, fireEvent } = testingLibrary;
  return { cleanup, fireEvent, vite, view };
}
