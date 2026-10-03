import test from "node:test";
import assert from "node:assert/strict";
import { APP_CONFIG } from "../data/constants.ts";
import { encodeSave } from "../logic/save-format.ts";
import { createInitialState } from "../logic/state.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { openBoard, renderGameApp } from "./test-render-game-app.ts";

type Rendered = Awaited<ReturnType<typeof renderGameApp>>;

async function withStartedGame(
  body: (app: Rendered, doc: Document) => Promise<void>,
) {
  await withJsdomWindow(async (dom) => {
    const app = await renderGameApp(dom);
    try {
      app.fireEvent.click(
        await app.view.findByRole("button", { name: "Rozpocznij odprawę" }),
      );
      await app.view.findByRole("heading", {
        name: "Wybierz 23 zawodników na test",
      });
      await body(app, dom.window.document);
      await app.act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
    } finally {
      app.cleanup();
      await app.vite.close();
    }
  });
}

const liveText = (doc: Document) =>
  doc.querySelector('[aria-live="polite"]')?.textContent ?? "";
const sheetExpanded = (doc: Document) =>
  doc.querySelector(".phone-dock-toggle")?.getAttribute("aria-expanded");
const eventContext = (doc: Document) =>
  doc.querySelector(".modal .event-context")?.textContent ?? "";

test("a random fill's events name the real count and their undo reverts the fill", async () => {
  await withStartedGame(async ({ fireEvent, waitFor, view }, doc) => {
    for (let pick = 0; pick < 5; pick++)
      fireEvent.click(view.getAllByRole("button", { name: /^Powołaj: / })[0]!);
    await openBoard(view);
    fireEvent.click(view.getByRole("button", { name: "Dobierz losowo" }));
    await view.findByRole("heading", { name: "Raport medyczny: przeciążenie" });
    for (const index of [1, 2, 3]) {
      assert.equal(
        eventContext(doc),
        `Przy 23 powołaniach sztab zgłasza sprawę do rozstrzygnięcia (${index} z 3). Twój wybór wpłynie na ocenę całej kadry.`,
      );
      if (index === 3) break;
      fireEvent.click(
        doc.querySelector<HTMLButtonElement>(".modal .decision")!,
      );
      await waitFor(() =>
        assert.match(eventContext(doc), new RegExp(`\\(${index + 1} z 3\\)`)),
      );
    }
    // Back to the first event, whose undo reverts the whole fill.
    fireEvent.click(view.getByRole("button", { name: "Cofnij" }));
    fireEvent.click(view.getByRole("button", { name: "Cofnij" }));
    await waitFor(() => assert.match(eventContext(doc), /\(1 z 3\)/));
    fireEvent.click(
      view.getByRole("button", { name: "Cofnij ostatnią decyzję" }),
    );
    await waitFor(() =>
      assert.equal(
        liveText(doc),
        "Cofnięto powołanie 18 zawodników. Powołani: 5 z 23.",
      ),
    );
    assert.equal(doc.querySelector(".modal .event-context"), null);
    assert.equal(sheetExpanded(doc), "true");
  });
});

test("undo in the open sheet keeps it open and focuses its handle when history empties", async () => {
  // A saved started game with no history: the call-up below is the only undo step.
  const saved = encodeSave({ ...createInitialState(11), started: true });
  await withJsdomWindow(async (dom) => {
    dom.window.localStorage.setItem(APP_CONFIG.storageKey, saved);
    const app = await renderGameApp(dom);
    const { fireEvent, waitFor, view } = app;
    const doc = dom.window.document;
    try {
      await view.findByRole("heading", {
        name: "Wybierz 23 zawodników na test",
      });
      const pick = view.getAllByRole("button", { name: /^Powołaj: / })[0]!;
      const name = pick.getAttribute("aria-label")!.replace(/^Powołaj: /, "");
      fireEvent.click(pick);
      await openBoard(view);
      const undoButton = view.getByRole("button", { name: "Cofnij" });
      undoButton.focus();
      fireEvent.click(undoButton);
      await waitFor(() =>
        assert.equal(
          liveText(doc),
          `Cofnięto powołanie: ${name}. Powołani: 0 z 23.`,
        ),
      );
      assert.equal(sheetExpanded(doc), "true");
      assert.equal(undoButton.hasAttribute("disabled"), true);
      assert.equal(
        doc.activeElement?.classList.contains("phone-dock-handle"),
        true,
      );
      await app.act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
    } finally {
      app.cleanup();
      await app.vite.close();
    }
  });
});

test("undoing the camp end from the sheet closes it", async () => {
  await withStartedGame(async ({ fireEvent, waitFor, view }, doc) => {
    await openBoard(view);
    fireEvent.click(view.getByRole("button", { name: "Dobierz losowo" }));
    await view.findByRole("heading", { name: "Raport medyczny: przeciążenie" });
    for (let step = 0; step < 3; step++) {
      const decision = doc.querySelector<HTMLButtonElement>(".modal .decision");
      fireEvent.click(decision!);
      if (step < 2)
        await waitFor(() =>
          assert.notEqual(
            doc.querySelector(".modal .decision") === decision,
            true,
          ),
        );
    }
    await waitFor(() =>
      assert.equal(doc.querySelector(".modal .decision") === null, true),
    );
    fireEvent.click(
      doc.querySelector<HTMLButtonElement>(".phone-dock .finalize")!,
    );
    fireEvent.click(
      await view.findByRole("button", { name: "Przejdź do powołań na EURO" }),
    );
    await openBoard(view);
    fireEvent.click(view.getByRole("button", { name: "Cofnij" }));
    await waitFor(() =>
      assert.equal(
        liveText(doc),
        "Cofnięto zakończenie zgrupowania. Powołani: 23 z 23.",
      ),
    );
    assert.equal(sheetExpanded(doc), "false");
  });
});
