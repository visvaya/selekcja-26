import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { UI_TEXT as text } from "./text.ts";
import { CHANGELOG, GAME_VERSION } from "../data/changelog.ts";

// A single test, like game-app.test.ts and save-status-banner.test.ts: `screen` from
// @testing-library/dom binds to `document.body` once, at first import, so a second JSDOM
// document created by a second `withJsdomWindow` call in the same file would leave `screen`
// pointed at the first (already closed) document. Staying inside one JSDOM session for both
// scenarios avoids that.
test("changelog section on the start screen and in isolation", async () => {
  await withJsdomWindow(async (dom) => {
    dom.window.scrollTo = () => {};
    const React = await import("react");
    const { fireEvent, render, screen, cleanup } =
      await import("@testing-library/react");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    try {
      const { GameApp } = (await vite.ssrLoadModule(
        "/src/ui/game-app.tsx",
      )) as typeof import("./game-app.tsx");
      render(React.createElement(GameApp));

      assert.ok(
        await screen.findByRole("heading", { name: text.changelogTitle }),
      );
      assert.ok(screen.getByText(text.topBarVersionAccessible(GAME_VERSION)));
      const latest = CHANGELOG[0]!,
        older = CHANGELOG[1]!;
      assert.ok(
        screen.getByText(
          text.changelogVersionLabel(latest.version, latest.date),
        ),
      );
      for (const note of text.changelogNotes[latest.version])
        assert.ok(screen.getByText(note));

      const toggle = screen.getByRole("button", {
        name: text.changelogShowOlder(CHANGELOG.length - 1),
      });
      assert.equal(toggle.getAttribute("aria-expanded"), "false");
      assert.equal(toggle.classList.contains("changelog-toggle"), true);
      assert.equal(toggle.classList.contains("action-button"), false);

      fireEvent.click(toggle);
      assert.equal(toggle.getAttribute("aria-expanded"), "true");
      assert.ok(screen.getByRole("button", { name: text.changelogHideOlder }));
      assert.ok(
        screen.getByText(text.changelogVersionLabel(older.version, older.date)),
      );
      for (const note of text.changelogNotes[older.version])
        assert.ok(screen.getByText(note));

      cleanup();

      const { ChangelogSection } = (await vite.ssrLoadModule(
        "/src/ui/changelog-section.tsx",
      )) as typeof import("./changelog-section.tsx");
      render(React.createElement(ChangelogSection));
      assert.ok(screen.getByRole("heading", { name: text.changelogTitle }));
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
