import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { GroupPosition, Player } from "../data/types.ts";
import { createServer } from "vite";
import { withJsdomWindow } from "./test-jsdom-window.ts";

test("start, profile, comparison, event and position filter work together", async () => {
  await withJsdomWindow(async (dom) => {
    dom.window.scrollTo = () => {};
    const React = await import("react");
    const { act, fireEvent, render, screen, waitFor, cleanup } =
      await import("@testing-library/react");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    try {
      const { GameApp } = (await vite.ssrLoadModule(
        "/src/ui/game-app.tsx",
      )) as typeof import("./game-app.tsx");
      // Node's assert failure message runs util.inspect on both values; doing that on a live
      // DOM node walks jsdom's circular window/document graph and can exhaust the heap. Every
      // focus check below compares to a boolean instead of asserting on the node directly.
      function isFocused(element: Element | null): boolean {
        return dom.window.document.activeElement === element;
      }
      const view = render(React.createElement(GameApp));
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
