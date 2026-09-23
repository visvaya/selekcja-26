import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { players } from "../data/catalog.ts";
import type { GroupPosition, Player } from "../data/types.ts";
import { createServer } from "vite";

test("start, profile, comparison, event and position filter work together", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.test",
  });
  const previous: PropertyDescriptor[] = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Node",
  ].map(
    (key) =>
      Object.getOwnPropertyDescriptor(globalThis, key) ?? {
        configurable: true,
        value: undefined,
      },
  );
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Node",
  ] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === "window" ? dom.window : dom.window[key],
    });
  }
  dom.window.scrollTo = () => {};
  const React = await import("react");
  const { fireEvent, render, screen, waitFor, cleanup } =
    await import("@testing-library/react");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { GameApp } = (await vite.ssrLoadModule(
      "/src/ui/game-app.tsx",
    )) as typeof import("./game-app.tsx");
    const view = render(React.createElement(GameApp));
    fireEvent.click(
      await screen.findByRole("button", { name: "Rozpocznij odprawę" }),
    );
    assert.ok(
      await screen.findByRole("heading", {
        name: "Wybierz 23 zawodników na test",
      }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Profil" })[0]!);
    assert.ok(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: "Wróć do listy" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Porównaj" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Porównaj" })[0]!);
    assert.ok(
      screen.getByRole("heading", { name: "Dwóch kandydatów, jedno miejsce?" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść porównanie" }));
    assert.equal(view.container.querySelectorAll(".compare-on").length, 0);
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
    assert.equal(view.container.querySelectorAll(".player.selected").length, 0);
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
    assert.ok(
      screen.getByRole("heading", { name: "Wybierz finałową kadrę 26" }),
    );
    fillSquad({ BR: 3, OBR: 8, POM: 8, ATA: 4 }, 26);
    fireEvent.click(screen.getByRole("button", { name: "Zatwierdź" }));
    assert.ok(screen.getByRole("heading", { name: "Przebieg turnieju" }));
    fireEvent.click(screen.getByRole("button", { name: "Zagraj od początku" }));
    assert.ok(screen.getByRole("button", { name: "Rozpocznij odprawę" }));
  } finally {
    cleanup();
    await vite.close();
    for (const [index, key] of [
      "window",
      "document",
      "navigator",
      "HTMLElement",
      "Node",
    ].entries()) {
      Object.defineProperty(globalThis, key, previous[index]!);
    }
    dom.window.close();
  }
});
