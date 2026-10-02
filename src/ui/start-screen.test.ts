import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players, systems } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import { UI_TEXT } from "./text.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadStartScreen() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const { StartScreen } = (await vite.ssrLoadModule(
    "/src/ui/start-screen.tsx",
  )) as typeof import("./start-screen.tsx");
  return { vite, StartScreen };
}

test("ticket candidate count is pluralised in the genitive", () => {
  assert.ok(UI_TEXT.ticket.candidates(1).endsWith("kandydata."));
  assert.ok(UI_TEXT.ticket.candidates(22).endsWith("kandydatów."));
});

test("StartScreen shows the EURO ticket built from game data", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    const { vite, StartScreen } = await loadStartScreen();
    try {
      const noop = () => {};
      const { container, getByRole, queryByText } = render(
        React.createElement(StartScreen, {
          system: "4231",
          canUndo: false,
          headingRef: React.createRef<HTMLHeadingElement>(),
          onSystem: noop,
          onStart: noop,
          onUndo: noop,
        }),
      );
      assert.ok(getByRole("heading", { level: 1, name: "Bilet na EURO" }));
      const lead = container.querySelector(".start-ticket-lead")?.textContent;
      assert.ok(
        lead?.includes(UI_TEXT.ticket.candidates(players.length)) ?? false,
      );
      assert.ok(lead?.includes("Wybierasz spośród 61 kandydatów.") ?? false);
      const pairs = [...container.querySelectorAll("dl > div")].map(
        (row) => row.querySelector("dd")?.textContent,
      );
      assert.equal(container.querySelectorAll("dl dt").length, 4);
      assert.deepEqual(pairs, [
        String(Object.keys(UI_TEXT.stages).length),
        "Zgrupowanie kontrolne",
        String(GAME_RULES.camp.squadSizePlayers),
        String(GAME_RULES.final.squadSizePlayers),
      ]);
      assert.deepEqual(pairs, ["2", "Zgrupowanie kontrolne", "23", "26"]);
      assert.equal(
        container.querySelector(".hero-e-stub")?.getAttribute("aria-hidden"),
        "true",
      );
      assert.equal(queryByText("Notatka sztabu szkoleniowego") === null, true);
      cleanup();
    } finally {
      await vite.close();
    }
  });
});

test("StartScreen offers the formations as a radio group with a live map", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, StartScreen } = await loadStartScreen();
    try {
      const calls: string[] = [];
      const props = {
        canUndo: false,
        headingRef: React.createRef<HTMLHeadingElement>(),
        onSystem: (value: string) => calls.push(value),
        onStart: () => {},
        onUndo: () => {},
      };
      const view = render(
        React.createElement(StartScreen, { ...props, system: "4231" }),
      );
      const group = view.getByRole("group", { name: "Wybierz formację" });
      const radios = [...group.querySelectorAll('input[type="radio"]')];
      assert.equal(radios.length, 3);
      const names = ["4–2–3–1", "3–4–2–1", "4–3–3"];
      for (const name of names) {
        const radio = view.getByRole("radio", {
          name: new RegExp(`^${name} `),
        }) as HTMLInputElement;
        assert.equal(radio.checked, name === "4–2–3–1");
      }
      fireEvent.click(view.getByRole("radio", { name: /^4–3–3 / }));
      assert.deepEqual(calls, ["433"]);
      fireEvent.click(view.getByRole("radio", { name: /^4–2–3–1 / }));
      assert.deepEqual(calls, ["433"]);

      const nodeTexts = () =>
        [...view.container.querySelectorAll(".model-preview .pitch-node")].map(
          (node) => node.textContent,
        );
      const shape = (id: string) =>
        systems.find((candidate) => candidate.id === id)!.shape.flat();
      const map = view.getByRole("img", {
        name: "4–2–3–1. Mapa pozycji dla wybranej formacji.",
      });
      assert.deepEqual(nodeTexts(), shape("4231"));
      assert.equal(
        map.querySelector(".pitch-markings")?.getAttribute("aria-hidden"),
        "true",
      );
      view.rerender(
        React.createElement(StartScreen, { ...props, system: "3421" }),
      );
      assert.ok(
        view.getByRole("img", {
          name: "3–4–2–1. Mapa pozycji dla wybranej formacji.",
        }),
      );
      assert.deepEqual(nodeTexts(), shape("3421"));
      cleanup();
    } finally {
      await vite.close();
    }
  });
});

test("StartScreen groups the actions in one row and shows the notes side by side", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, StartScreen } = await loadStartScreen();
    try {
      let undoCalls = 0;
      const props = {
        system: "4231" as const,
        headingRef: React.createRef<HTMLHeadingElement>(),
        onSystem: () => {},
        onStart: () => {},
        onUndo: () => {
          undoCalls += 1;
        },
      };
      const single = render(
        React.createElement(StartScreen, { ...props, canUndo: false }),
      );
      const row = single.container.querySelector(".start-actions-row");
      const only = [...(row?.querySelectorAll("button") ?? [])];
      assert.deepEqual(
        only.map((button) => button.textContent),
        ["Rozpocznij odprawę"],
      );
      assert.equal(only[0]?.classList.contains("primary"), true);

      const notes = single.container.querySelector(".start-notes-layout");
      const sections = [...(notes?.querySelectorAll(":scope > section") ?? [])];
      const names = sections.map(
        (section) =>
          single.container.querySelector(
            `#${section.getAttribute("aria-labelledby")}`,
          )?.textContent,
      );
      assert.deepEqual(names, ["Co nowego", "Co planujemy"]);
      const planned = sections[1]!;
      assert.deepEqual(
        [...planned.querySelectorAll("li")].map((item) => item.textContent),
        [
          "Forma zawodników, która zmienia się w trakcie przygotowań.",
          "Możliwość zmiany systemu gry po marcowym zgrupowaniu.",
        ],
      );
      assert.equal(
        planned.querySelector("p")?.textContent,
        "Plany mogą się zmienić.",
      );
      cleanup();

      const both = render(
        React.createElement(StartScreen, { ...props, canUndo: true }),
      );
      const buttons = [
        ...(both.container
          .querySelector(".start-actions-row")
          ?.querySelectorAll("button") ?? []),
      ];
      assert.deepEqual(
        buttons.map((button) => button.textContent),
        ["Rozpocznij odprawę", "Cofnij"],
      );
      assert.equal(buttons[1]?.classList.contains("action-button"), true);
      fireEvent.click(buttons[1]!);
      assert.equal(undoCalls, 1);
      cleanup();
    } finally {
      await vite.close();
    }
  });
});
