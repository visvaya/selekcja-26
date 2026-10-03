import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { GameState, Player, PlayerId, RoleId } from "../data/types.ts";
import { createInitialState } from "../logic/state.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { renderComponent, renderGameApp } from "./test-render-game-app.ts";

const base: GameState = { ...createInitialState(5), started: true };

// two players with equal quality, so the quality row is a tie
function tiedPair(): [Player, Player] {
  for (const left of players) {
    const right = players.find(
      (other) => other.id !== left.id && other.ov === left.ov,
    );
    if (right) return [left, right];
  }
  throw new Error("No two players share a quality value");
}

// two players with at least one shared trait
function sharingPair(): [Player, Player] {
  for (const left of players) {
    const keys = new Set<RoleId>(
      left.roles.filter((role) => role !== "leftFoot"),
    );
    const right = players.find(
      (other) =>
        other.id !== left.id && other.roles.some((role) => keys.has(role)),
    );
    if (right) return [left, right];
  }
  throw new Error("No two players share a trait");
}

function withSelected(count: number, except: PlayerId[]): GameState {
  const ids = players
    .filter((player) => !except.includes(player.id))
    .slice(0, count)
    .map((player) => player.id);
  return { ...base, selected: new Set(ids) };
}

type Calls = {
  toggled: PlayerId[];
  both: number;
  cleared: number;
  closed: number;
  profiles: PlayerId[];
};

async function withComparison(
  pair: [Player, Player],
  state: GameState,
  body: (
    panel: HTMLElement,
    calls: Calls,
    fireEvent: typeof import("@testing-library/react").fireEvent,
  ) => void,
): Promise<void> {
  await withJsdomWindow(async () => {
    const calls: Calls = {
      toggled: [],
      both: 0,
      cleared: 0,
      closed: 0,
      profiles: [],
    };
    const { vite, view, cleanup, fireEvent } = await renderComponent(
      "/src/ui/comparison-dialog.tsx",
      "ComparisonDialog",
      {
        left: pair[0],
        right: pair[1],
        state,
        onClose: () => {
          calls.closed += 1;
        },
        onToggle: (id: PlayerId) => {
          calls.toggled.push(id);
        },
        onSelectBoth: () => {
          calls.both += 1;
        },
        onOpenProfile: (id: PlayerId) => {
          calls.profiles.push(id);
        },
        onClearComparison: () => {
          calls.cleared += 1;
        },
        restoreFocusFallback: () => {},
      },
    );
    try {
      body(
        view.baseElement.querySelector<HTMLElement>('[role="dialog"]')!,
        calls,
        fireEvent,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

const button = (panel: HTMLElement, name: string) =>
  [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
    (element) =>
      (element.getAttribute("aria-label") ?? element.textContent) === name,
  );

test("the comparison: one title, two cards with stable names and the rows in order", async () => {
  const pair = tiedPair();
  await withComparison(pair, base, (panel, calls, fireEvent) => {
    const headings = panel.querySelectorAll("h2");
    assert.equal(headings.length, 1);
    assert.equal(headings[0]!.textContent, "Analiza porównawcza");
    assert.equal(panel.textContent?.includes("Dwóch kandydatów"), false);
    for (const player of pair) {
      const select = button(panel, `Powołaj: ${player.name}`)!;
      assert.equal(select.getAttribute("aria-pressed"), "false");
      assert.equal(select.textContent, "Powołaj");
      fireEvent.click(button(panel, `Profil: ${player.name}`)!);
    }
    assert.deepEqual(
      calls.profiles,
      pair.map((player) => player.id),
    );
    assert.deepEqual(
      [...panel.querySelectorAll(".h2h-label")].map(
        (label) => label.textContent,
      ),
      [
        "Ocena selekcyjna",
        "Jakość",
        "Forma",
        "Zdrowie",
        "Taktyka",
        "Doświadczenie",
        "Zgranie kadrowe",
        "Wpływ na grupę",
        "Noga wiodąca",
        "Cechy",
      ],
    );
    const quality = panel.querySelectorAll(".h2h-row")[1]!;
    assert.equal(quality.classList.contains("is-tie"), true);
    assert.equal(quality.querySelectorAll(".h2h-diff").length, 0);
    assert.equal(quality.querySelectorAll(".h2h-bar i.better").length, 2);
  });
});

test("Powołaj obu: ready, blocked with a reason, absent when one is called up", async () => {
  const pair = tiedPair();
  const ids = pair.map((player) => player.id);
  await withComparison(pair, base, (panel, calls, fireEvent) => {
    const both = button(
      panel,
      `Powołaj obu: ${pair[0].name} i ${pair[1].name}`,
    )!;
    assert.equal(both.classList.contains("primary"), true);
    fireEvent.click(both);
    assert.equal(calls.both, 1);
    const clear = button(panel, "Wyczyść porównanie")!;
    assert.equal(clear.classList.contains("action-button"), true);
    assert.equal(clear.classList.contains("primary"), false);
    fireEvent.click(clear);
    assert.equal(calls.cleared, 1);
    assert.equal(calls.closed, 1);
  });
  await withComparison(
    pair,
    withSelected(22, ids),
    (panel, calls, fireEvent) => {
      const both = button(
        panel,
        `Powołaj obu: ${pair[0].name} i ${pair[1].name}`,
      )!;
      assert.equal(both.getAttribute("aria-disabled"), "true");
      const reason = panel.ownerDocument.getElementById(
        both.getAttribute("aria-describedby") ?? "",
      );
      assert.equal(
        reason?.textContent,
        "Zostało za mało miejsc, by powołać obu",
      );
      fireEvent.click(both);
      assert.equal(calls.both, 0);
    },
  );
  const oneSelected = { ...base, selected: new Set([ids[0]!]) };
  await withComparison(pair, oneSelected, (panel) => {
    assert.equal(button(panel, "Powołaj obu"), undefined);
    assert.equal(
      [...panel.querySelectorAll("button")].some((element) =>
        element.textContent?.startsWith("Powołaj obu"),
      ),
      false,
    );
    const select = button(panel, `Powołaj: ${pair[0].name}`)!;
    assert.equal(select.getAttribute("aria-pressed"), "true");
    assert.equal(select.textContent, "Powołany");
  });
});

test("shared traits come first and are read out in a hidden sentence", async () => {
  const pair = sharingPair();
  await withComparison(pair, base, (panel) => {
    const hidden = panel.querySelector(".h2h-text .visually-hidden");
    assert.match(hidden?.textContent ?? "", /^Wspólne cechy: .+\.$/);
    const firstList = panel.querySelector(".h2h-edge-list")!;
    assert.equal(
      firstList.firstElementChild?.classList.contains("tag-shared"),
      true,
    );
  });
});

test("app: the first Porównaj is announced, Powołaj obu calls up both and keeps focus", async () => {
  await withJsdomWindow(async (dom) => {
    const { fireEvent, cleanup, vite, view } = await renderGameApp(dom);
    try {
      fireEvent.click(
        await view.findByRole("button", { name: "Rozpocznij odprawę" }),
      );
      const compare = await view.findAllByRole("button", {
        name: /^Porównaj: /,
      });
      const first = compare.at(-1)!;
      const firstName = first
        .getAttribute("aria-label")!
        .replace("Porównaj: ", "");
      fireEvent.click(first);
      const live = view.container.querySelector('[aria-live="polite"]');
      assert.equal(
        live?.textContent,
        `Wybrano do porównania: ${firstName}. Wybierz drugiego zawodnika.`,
      );
      fireEvent.click(compare.at(-2)!);
      const both = view.getByRole("button", { name: /^Powołaj obu: / });
      fireEvent.click(both);
      assert.equal(
        view.container.querySelectorAll(".player.selected").length,
        2,
      );
      assert.equal(
        view.queryByRole("button", { name: /^Powołaj obu: / }),
        null,
      );
      const select = dom.window.document.querySelector(
        ".compare-card .compare-select",
      );
      assert.equal(dom.window.document.activeElement === select, true);
      // "Profil" on a card replaces the comparison with that profile
      fireEvent.click(
        view
          .getAllByRole("button", { name: /^Profil: / })
          .find((element) => element.closest(".compare-card"))!,
      );
      assert.equal(dom.window.document.querySelector(".compare-card"), null);
      assert.equal(
        view.getByRole("dialog").querySelector(".eyebrow")?.textContent,
        "Profil",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("app: Powołaj obu across the event threshold opens the event", async () => {
  await withJsdomWindow(async (dom) => {
    const { fireEvent, cleanup, vite, view } = await renderGameApp(dom);
    try {
      fireEvent.click(
        await view.findByRole("button", { name: "Rozpocznij odprawę" }),
      );
      const compare = await view.findAllByRole("button", {
        name: /^Porównaj: /,
      });
      const last = compare.at(-1)!,
        second = compare.at(-2)!;
      for (let count = 0; count < 8; count++)
        fireEvent.click(
          view.getAllByRole("button", { name: /^Powołaj: / })[0]!,
        );
      assert.equal(
        view.container.querySelectorAll(".player.selected").length,
        8,
      );
      fireEvent.click(last);
      fireEvent.click(second);
      fireEvent.click(view.getByRole("button", { name: /^Powołaj obu: / }));
      assert.equal(
        view.container.querySelectorAll(".player.selected").length,
        10,
      );
      assert.equal(dom.window.document.querySelector(".compare-card"), null);
      assert.ok(dom.window.document.querySelector(".modal .decision"));
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
