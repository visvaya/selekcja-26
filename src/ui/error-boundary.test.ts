import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { buildResetUrl } from "./error-boundary-reset-url.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { UI_TEXT as text } from "./text.ts";

function ThrowingChild(): never {
  throw new Error("boom");
}

test("buildResetUrl adds the reset query param and keeps other params", () => {
  const result = buildResetUrl("https://example.test/game?foo=bar");
  assert.match(result, /reset/);
  assert.match(result, /foo=bar/);
});

// Real navigation (location.reload()/assign()) cannot be stubbed in jsdom -- its Location
// object exposes those methods as non-configurable, non-writable own properties -- so
// clicking the buttons here exercises the real jsdom implementation, which logs
// "Not implemented: navigation" instead of throwing or actually navigating. The URL the
// reset button would navigate to is covered separately above, as a pure function.
test("ErrorBoundary catches render errors and shows the fallback", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, screen, fireEvent, cleanup } =
      await import("@testing-library/react");
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: "custom",
    });
    try {
      const { ErrorBoundary } = (await vite.ssrLoadModule(
        "/src/ui/error-boundary.tsx",
      )) as typeof import("./error-boundary.tsx");

      // React and this component's own componentDidCatch both log the thrown error to the
      // console here; that is expected and not suppressed.
      render(
        React.createElement(
          ErrorBoundary,
          null,
          React.createElement(ThrowingChild),
        ),
      );

      const heading = await screen.findByRole("heading", {
        name: text.errorBoundary.title,
      });
      assert.ok(screen.getByText(text.errorBoundary.message));
      assert.equal(
        document.activeElement,
        heading,
        "focus should move to the fallback heading",
      );

      const reloadButton = screen.getByRole("button", {
        name: text.errorBoundary.reload,
      });
      const resetButton = screen.getByRole("button", {
        name: text.errorBoundary.reset,
      });

      // Both real jsdom navigation calls only log "Not implemented"; they must not throw.
      assert.doesNotThrow(() => fireEvent.click(reloadButton));
      assert.doesNotThrow(() => fireEvent.click(resetButton));

      cleanup();

      render(React.createElement(ErrorBoundary, null, "ok-child"));
      assert.ok(screen.getByText("ok-child"));
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
