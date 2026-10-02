import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { GAME_VERSION } from "../data/changelog.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

test("AppHeader shows the stage label, the stage pill and the version", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    // `hmr: false` keeps this server off the default HMR port other test files may use.
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    try {
      const { AppHeader } = (await vite.ssrLoadModule(
        "/src/ui/app-header.tsx",
      )) as typeof import("./app-header.tsx");
      const { container, getByText } = render(
        React.createElement(AppHeader, { phase: "ODPRAWA" }),
      );
      const group = container.querySelector("header .phase-group");
      assert.equal(group?.textContent, "Etap:ODPRAWA");
      assert.equal(group?.firstElementChild?.className ?? "", "phase-label");
      assert.equal(container.querySelector(".phase")?.textContent, "ODPRAWA");
      assert.equal(
        getByText(`Wersja ${GAME_VERSION}`).textContent,
        `Wersja ${GAME_VERSION}`,
      );
      cleanup();
    } finally {
      await vite.close();
    }
  });
});
