import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import type { SaveStatus } from "../logic/save-status.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

const idle: SaveStatus = {
  issue: null,
  unavailableDismissed: false,
  recovered: false,
};

test("SaveStatusBanner renders each save status correctly", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, screen, fireEvent, cleanup } =
      await import("@testing-library/react");
    // `hmr: false` avoids a second Vite dev server fighting game-app.test.ts's own server for
    // the default HMR websocket port when node:test runs test files in this directory
    // concurrently (this one needs no HMR anyway -- it loads the module once for a single
    // render).
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    try {
      const { SaveStatusBanner } = (await vite.ssrLoadModule(
        "/src/ui/save-status-banner.tsx",
      )) as typeof import("./save-status-banner.tsx");

      let retryCalls = 0;
      let dismissCalls = 0;
      const onRetry = () => {
        retryCalls++;
      };
      const onDismiss = () => {
        dismissCalls++;
      };

      function renderStatus(status: SaveStatus) {
        return React.createElement(SaveStatusBanner, {
          status,
          onRetry,
          onDismiss,
        });
      }

      // A single render, reused across scenarios via `rerender`, keeps this test to one JSDOM
      // instance and one Vite SSR module load instead of booting the full GameApp (61 candidate
      // cards) per scenario, which is what caused the coverage-run OOM this file replaces.
      const view = render(renderStatus(idle));

      // Idle: no issue and not recovered keeps the alert element mounted but empty,
      // and an empty status region. The alert stays mounted (not conditionally
      // rendered) so assistive tech observes it as a live region before it ever
      // gets text, rather than encountering a freshly inserted, already-populated node.
      assert.equal(screen.getByRole("alert").textContent, "");
      assert.equal(screen.getByRole("status").textContent, "");

      // Failed: shows the failed text and a retry button that calls onRetry.
      view.rerender(
        renderStatus({
          issue: "failed",
          unavailableDismissed: false,
          recovered: false,
        }),
      );
      assert.equal(
        screen.getByRole("alert").textContent,
        "Nie udało się zapisać postępu. Ostatnie zmiany mogą przepaść po zamknięciu karty.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
      assert.equal(retryCalls, 1);
      assert.equal(dismissCalls, 0);

      // Quota: shows the quota text.
      view.rerender(
        renderStatus({
          issue: "quota",
          unavailableDismissed: false,
          recovered: false,
        }),
      );
      assert.equal(
        screen.getByRole("alert").textContent,
        "Nie udało się zapisać postępu: w pamięci przeglądarki brakuje miejsca. Zwolnij miejsce i spróbuj ponownie.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
      assert.equal(retryCalls, 2);

      // Unavailable: shows the unavailable text and a "Rozumiem" button that calls onDismiss.
      view.rerender(
        renderStatus({
          issue: "unavailable",
          unavailableDismissed: false,
          recovered: false,
        }),
      );
      assert.equal(
        screen.getByRole("alert").textContent,
        "Postęp nie jest zapisywany: przeglądarka nie udostępnia pamięci (np. tryb prywatny). Możesz grać dalej, ale po zamknięciu karty gra zacznie się od nowa.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Rozumiem" }));
      assert.equal(dismissCalls, 1);
      assert.equal(retryCalls, 2);

      // Dismissed: an unavailable issue that has been dismissed empties the alert
      // (still mounted) and renders no button.
      view.rerender(
        renderStatus({
          issue: "unavailable",
          unavailableDismissed: true,
          recovered: false,
        }),
      );
      assert.equal(screen.getByRole("alert").textContent, "");
      assert.equal(screen.queryByRole("button"), null);

      // Recovered: no issue and recovered puts the announcement in the status region,
      // and the alert stays mounted but empty.
      view.rerender(
        renderStatus({
          issue: null,
          unavailableDismissed: false,
          recovered: true,
        }),
      );
      assert.equal(screen.getByRole("alert").textContent, "");
      assert.equal(screen.getByRole("status").textContent, "Postęp zapisany.");
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
