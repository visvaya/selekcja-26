import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { GroupPosition, Player } from "../data/types.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { renderGameApp } from "./test-render-game-app.ts";
import { UI_TEXT } from "./text.ts";

test("start, profile, comparison, event and position filter work together", async () => {
  await withJsdomWindow(async (dom) => {
    const { act, fireEvent, screen, waitFor, cleanup, vite, view } =
      await renderGameApp(dom);
    try {
      // Node's assert failure message runs util.inspect on both values; doing that on a live
      // DOM node walks jsdom's circular window/document graph and can exhaust the heap. Every
      // focus check below compares to a boolean instead of asserting on the node directly.
      function isFocused(element: Element | null): boolean {
        return dom.window.document.activeElement === element;
      }
      fireEvent.click(
        await screen.findByRole("button", { name: "Rozpocznij odprawę" }),
      );
      const campHeading = await screen.findByRole("heading", {
        name: "Wybierz 23 zawodników na test",
      });
      // The screen that just opened has no dialog, and the button the user clicked is gone
      // (the start screen unmounted), so focus must move to the new screen's own heading
      // rather than falling back to the body.
      assert.equal(isFocused(campHeading), true);
      fireEvent.click(screen.getAllByRole("button", { name: "Profil" })[0]!);
      assert.ok(screen.getByRole("dialog"));
      assert.equal(
        dom.window.document.activeElement?.tagName,
        "BUTTON",
        "the dialog must focus one of its own buttons on open",
      );
      fireEvent.click(screen.getByRole("button", { name: "Wróć do listy" }));
      // Closing the dialog must not drop focus to the body, whether or not the button that
      // opened it was itself focused beforehand.
      assert.equal(isFocused(dom.window.document.body), false);
      fireEvent.click(screen.getAllByRole("button", { name: "Porównaj" })[0]!);
      fireEvent.click(screen.getAllByRole("button", { name: "Porównaj" })[0]!);
      assert.ok(
        screen.getByRole("heading", {
          name: "Dwóch kandydatów, jedno miejsce?",
        }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Wyczyść porównanie" }),
      );
      assert.equal(view.container.querySelectorAll(".compare-on").length, 0);
      assert.equal(isFocused(dom.window.document.body), false);
      fireEvent.click(screen.getByRole("button", { name: "LO (0)" }));
      assert.ok(screen.getByRole("heading", { name: "Lewy obrońca" }));
      fireEvent.click(screen.getByRole("button", { name: "Wszyscy (0)" }));
      fireEvent.click(screen.getByRole("button", { name: "Dobierz losowo" }));
      assert.ok(
        screen.getByRole("heading", { name: "Raport medyczny: przeciążenie" }),
      );
      fireEvent.click(
        screen
          .getByRole("dialog")
          .querySelector<HTMLButtonElement>(".action-button")!,
      );
      assert.equal(
        view.container.querySelectorAll(".player.selected").length,
        0,
      );
      for (let count = 0; count < 9; count++)
        fireEvent.click(screen.getAllByRole("button", { name: "Powołaj" })[0]!);
      assert.ok(
        screen.getByRole("heading", { name: "Raport medyczny: przeciążenie" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Ogranicz jego minuty/ }),
      );
      await waitFor(() =>
        assert.equal(
          view.container.querySelectorAll(".player.selected").length,
          9,
        ),
      );

      function selectedNames(): Set<string> {
        return new Set(
          [...view.container.querySelectorAll(".player.selected h3")].map(
            (heading) => heading.textContent ?? "",
          ),
        );
      }
      function choose(player: Player) {
        const heading = [...view.container.querySelectorAll(".player h3")].find(
          (element) => element.textContent === player.name,
        );
        const button = heading
          ?.closest("article")
          ?.querySelector<HTMLButtonElement>(".select-btn");
        assert.ok(button, `Missing selection button for ${player.name}`);
        fireEvent.click(button);
        const decision =
          view.container.querySelector<HTMLButtonElement>(".modal .decision");
        if (decision) fireEvent.click(decision);
      }
      function fillSquad(
        requirements: Record<GroupPosition, number>,
        limit: number,
      ) {
        for (const group of ["BR", "OBR", "POM", "ATA"] as GroupPosition[]) {
          while (
            players.filter(
              (player) =>
                player.pos === group && selectedNames().has(player.name),
            ).length < requirements[group]
          ) {
            choose(
              players.find(
                (player) =>
                  player.pos === group && !selectedNames().has(player.name),
              )!,
            );
          }
        }
        while (selectedNames().size < limit) {
          const goalkeepers = players.filter(
            (player) => player.pos === "BR" && selectedNames().has(player.name),
          ).length;
          choose(
            players.find(
              (player) =>
                !selectedNames().has(player.name) &&
                (goalkeepers < requirements.BR || player.pos !== "BR"),
            )!,
          );
        }
      }
      fillSquad({ BR: 2, OBR: 7, POM: 7, ATA: 3 }, 23);
      fireEvent.click(
        screen.getByRole("button", { name: "Jedź na zgrupowanie" }),
      );
      assert.ok(
        screen.getByRole("heading", {
          name: "Masz więcej danych. Nie wszystkie są wygodne.",
        }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Przejdź do powołań na EURO" }),
      );
      const finalHeading = screen.getByRole("heading", {
        name: "Wybierz finałową kadrę 26",
      });
      // The camp report dialog closed into the final screen (a stage change, not just a
      // modal close): focus must land on that screen's own heading.
      assert.equal(isFocused(finalHeading), true);
      fillSquad({ BR: 3, OBR: 8, POM: 8, ATA: 4 }, 26);
      fireEvent.click(screen.getByRole("button", { name: "Zatwierdź" }));
      assert.ok(screen.getByRole("heading", { name: "Przebieg turnieju" }));
      // The report's own heading is its level-1 heading (the outcome, e.g. "Faza grupowa"),
      // not the "Przebieg turnieju" section title above, which is only a level-2 heading.
      const reportHeading = screen.getByRole("heading", { level: 1 });
      assert.equal(isFocused(reportHeading), true);
      // The closing sentence speaks of Poland as "we" and matches the reported stage.
      const outcomeSentence = UI_TEXT.reportOutcome(
        reportHeading.textContent ?? "",
      );
      const summary = reportHeading.nextElementSibling?.textContent ?? "";
      assert.match(summary, /^Zdobyliśmy \d+ pkt w grupie\./);
      assert.equal(summary.endsWith(outcomeSentence ?? "missing"), true);
      fireEvent.click(
        screen.getByRole("button", { name: "Zagraj od początku" }),
      );
      const introHeading = screen.getByRole("heading", {
        name: "Jedna lista. Cały kraj ocenia.",
      });
      assert.ok(screen.getByRole("button", { name: "Rozpocznij odprawę" }));
      assert.equal(isFocused(introHeading), true);
      // Lets any still-in-flight autosave promise (and the reducer dispatch it triggers) settle,
      // and asks React to flush any passive effects it scheduled but hasn't run yet, while the
      // JSDOM globals are still installed. Without this, cleanup() can unmount the tree while a
      // scheduled passive-effect flush is still pending; that callback then runs after the
      // environment is torn down and throws reading `window.event`.
      await act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("live region announces undo, random fill and event outcomes", async () => {
  await withJsdomWindow(async (dom) => {
    // `screen` is bound to `document.body` once, at the first `@testing-library/react`
    // import in this process, so with a second JSDOM window in play it would still query
    // the first test's (by then closed) document. `view`'s own query methods are bound to
    // this render's `baseElement` instead, which stays correct across separate windows.
    const { act, fireEvent, waitFor, cleanup, vite, view } =
      await renderGameApp(dom);
    try {
      function liveRegionText(): string {
        return (
          view.container.querySelector('[aria-live="polite"]')?.textContent ??
          ""
        );
      }
      await view.findByRole("button", { name: "Rozpocznij odprawę" });
      // Only the balanced priority remains, so the start screen offers no priority choice.
      assert.equal(view.queryByText("Ustal priorytet selekcji"), null);
      // Nothing has changed the squad yet: the region must start empty, both on this first
      // render and while the save load (there is none to load here) settles.
      assert.equal(liveRegionText(), "");

      // Two system swaps before the game starts (neither changes the selected squad) give
      // two undo steps to exercise: reverting either always lands on the same "0 z 23"
      // wording, which is exactly the repeated-announcement case the mechanism must handle.
      const systemGrid = view.container.querySelectorAll(".choice-grid")[0]!;
      const systemButtons = [...systemGrid.querySelectorAll("button")];
      fireEvent.click(systemButtons[1]!);
      fireEvent.click(systemButtons[2]!);

      const expectedUndo = UI_TEXT.announcements.undo(
        0,
        GAME_RULES.camp.squadSizePlayers,
      );
      fireEvent.click(view.getByRole("button", { name: "Cofnij" }));
      await waitFor(() => assert.equal(liveRegionText(), expectedUndo));

      // A MutationObserver, not just the final text, proves the region's content was
      // actually mutated a second time: a screen reader announces on DOM mutation, so a
      // same-value setState that reused the old string without going through an empty
      // intermediate value would pass a text-only check while still announcing nothing.
      const liveRegion = view.container.querySelector('[aria-live="polite"]')!;
      let mutations = 0;
      const observer = new dom.window.MutationObserver(() => {
        mutations += 1;
      });
      observer.observe(liveRegion, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      fireEvent.click(view.getByRole("button", { name: "Cofnij" }));
      await waitFor(() => assert.equal(liveRegionText(), expectedUndo));
      assert.ok(
        mutations > 0,
        "repeating the same announcement must still mutate the live region",
      );
      observer.disconnect();

      fireEvent.click(view.getByRole("button", { name: "Rozpocznij odprawę" }));
      await view.findByRole("heading", {
        name: "Wybierz 23 zawodników na test",
      });

      const expectedAutoFill = UI_TEXT.announcements.autoFill(
        GAME_RULES.camp.squadSizePlayers,
        GAME_RULES.camp.squadSizePlayers,
        GAME_RULES.camp.squadSizePlayers,
      );
      fireEvent.click(view.getByRole("button", { name: "Dobierz losowo" }));
      await waitFor(() => assert.equal(liveRegionText(), expectedAutoFill));

      // A full squad crosses every camp event threshold at once; the first unresolved one
      // opens a blocking dialog on top of the just-announced random-fill message.
      await view.findByRole("heading", {
        name: "Raport medyczny: przeciążenie",
      });
      const expectedEvent = UI_TEXT.announcements.eventResolved(
        "Ogranicz jego minuty",
      );
      fireEvent.click(
        view.getByRole("button", { name: /Ogranicz jego minuty/ }),
      );
      await waitFor(() => assert.equal(liveRegionText(), expectedEvent));

      await act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
