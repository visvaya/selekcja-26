import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players } from "../data/catalog.ts";
import type { GameState, Player } from "../data/types.ts";
import { modelScore } from "../logic/scoring.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { scoreBand } from "./score-band.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadModules() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const card = (await vite.ssrLoadModule(
    "/src/ui/player-card.tsx",
  )) as typeof import("./player-card.tsx");
  const anchoring = (await vite.ssrLoadModule(
    "/src/ui/use-popover-anchoring.ts",
  )) as typeof import("./use-popover-anchoring.ts");
  return { vite, card, anchoring };
}

function player(id: string): Player {
  const found = players.find((candidate) => candidate.id === id);
  assert.ok(found, id);
  return found;
}

function campState(): GameState {
  return reduceGameState(createInitialState(7), { type: "start" });
}

function finalState(trial: GameState["trial"]): GameState {
  const state = reduceGameState(campState(), {
    type: "completeCamp",
    squad: players.slice(0, 23),
  });
  return { ...state, trial };
}

async function renderCard(target: Player, state: GameState) {
  const React = await import("react");
  const { render } = await import("@testing-library/react");
  const { vite, card } = await loadModules();
  const noop = () => {};
  const result = render(
    React.createElement(card.PlayerCard, {
      player: target,
      state,
      onToggle: noop,
      onProfile: noop,
      onCompare: noop,
    }),
  );
  return { vite, ...result };
}

function tagTexts(container: HTMLElement): string[] {
  return [...container.querySelectorAll(".tags .tag")].map(
    (tag) => tag.textContent ?? "",
  );
}

test("position badge is a popover button with codes and full names", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const target = player("pawel-wszolek");
    const { vite, container } = await renderCard(target, campState());
    try {
      const badge =
        container.querySelector<HTMLButtonElement>("button.pos.pos-def");
      assert.ok(badge);
      assert.equal(badge.querySelector("b")?.textContent, "PO");
      assert.equal(badge.querySelector("small")?.textContent, "PWO +1");
      assert.equal(
        badge.getAttribute("aria-label"),
        "PO, PWO, PS: prawy obrońca, prawy wahadłowy, prawe skrzydło",
      );
      const id = badge.getAttribute("popovertarget") ?? "";
      const popover = container.ownerDocument.getElementById(id);
      assert.equal(popover?.hasAttribute("popover"), true);
      assert.deepEqual(
        [...(popover?.querySelectorAll("li") ?? [])].map(
          (li) => li.textContent,
        ),
        ["PO · Prawy obrońca", "PWO · Prawy wahadłowy", "PS · Prawe skrzydło"],
      );
      const heading = container.querySelector("h3");
      assert.equal(heading?.textContent, target.name);
      const nameEl = heading?.querySelector(".name-trunc");
      assert.equal(nameEl?.getAttribute("data-first"), "Paweł");
      assert.equal(nameEl?.getAttribute("data-last"), "Wszołek");
      assert.equal(
        container.querySelector(".meta-club")?.textContent,
        target.club,
      );
      assert.equal(
        container
          .querySelector(".meta")
          ?.textContent?.startsWith(`${target.club} • `) ?? false,
        true,
      );
      assert.match(
        container.querySelector(".meta-age")?.textContent ?? "",
        /^ • \d+ (rok|lata|lat)$/,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("a single-position badge has no small code", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const { vite, container } = await renderCard(
      player("jan-bednarek"),
      campState(),
    );
    try {
      const badge = container.querySelector("button.pos");
      assert.equal(badge?.querySelector("small") === null, true);
      assert.equal(
        badge?.getAttribute("aria-label"),
        "PŚO: prawy środkowy obrońca",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("tags: camp first, then the flag, then roles alphabetically, never the lead foot", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const flagged = player("pawel-dawidowicz");
    const { vite, container } = await renderCard(
      flagged,
      finalState({ [flagged.id]: { delta: 2, note: "impressed" } }),
    );
    try {
      const tags = tagTexts(container);
      assert.equal(tags[0]?.startsWith("Zgrupowanie: przekonał (+"), true);
      assert.equal(tags[1], "Ryzyko urazu");
      assert.deepEqual(tags.slice(2), ["Odbiór", "Stoper"]);
      const camp = container.querySelector(".tags .tag");
      assert.equal(camp?.className, "tag tag-camp camp-plus");
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("a negative camp result uses a true minus and the minus class", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const target = player("jakub-kiwior");
    const { vite, container } = await renderCard(
      target,
      finalState({ [target.id]: { delta: -2, note: "disappointed" } }),
    );
    try {
      const tags = tagTexts(container);
      assert.match(tags[0] ?? "", /^Zgrupowanie: rozczarował \(−\d\)$/);
      assert.equal(
        container.querySelector(".tags .tag")?.className,
        "tag tag-camp camp-minus",
      );
      assert.deepEqual(tags.slice(1), ["Stoper", "Wyprowadzenie"]);
      assert.equal(tags.includes("Lewa noga"), false);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("score, meters and buttons", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const target = player("jakub-kiwior");
    const base = campState();
    const state: GameState = {
      ...base,
      selected: new Set([target.id]),
      compare: [target.id],
    };
    const { vite, container, getByRole } = await renderCard(target, state);
    try {
      const score = modelScore(target, state);
      assert.equal(
        container.querySelector(".score .score-label")?.textContent,
        "Ocena selekcyjna",
      );
      const value = container.querySelector(".score b");
      assert.equal(value?.className, `score-${scoreBand(score)}`);
      assert.equal(value?.textContent, String(score));
      const bars = [...container.querySelectorAll("progress")];
      assert.equal(bars.length, 4);
      for (const bar of bars) {
        const band = scoreBand(Number(bar.getAttribute("value")));
        assert.equal(
          bar.getAttribute("style"),
          `--tint: var(--meter-${band});`,
        );
      }
      const name = target.name;
      const select = getByRole("button", { name: `Powołany: ${name}` });
      assert.equal(select.getAttribute("aria-pressed"), "true");
      assert.equal(
        getByRole("button", { name: `Profil: ${name}` }).hasAttribute(
          "aria-pressed",
        ),
        false,
      );
      assert.equal(
        getByRole("button", { name: `Wybrany: ${name}` }).getAttribute(
          "aria-pressed",
        ),
        "true",
      );
      assert.equal(
        container.querySelector("article")?.className,
        "player selected compare-on",
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("an unselected strip names its buttons with the resting labels", async () => {
  await withJsdomWindow(async () => {
    const { cleanup } = await import("@testing-library/react");
    const target = player("jan-bednarek");
    const { vite, container, getByRole } = await renderCard(
      target,
      campState(),
    );
    try {
      assert.equal(
        getByRole("button", { name: `Powołaj: ${target.name}` }).getAttribute(
          "aria-pressed",
        ),
        "false",
      );
      assert.equal(
        getByRole("button", { name: `Porównaj: ${target.name}` }).getAttribute(
          "aria-pressed",
        ),
        "false",
      );
      assert.equal(container.querySelector("article")?.className, "player");
    } finally {
      cleanup();
      await vite.close();
    }
  });
});

test("popover anchoring closes a popover whose trigger is gone", async () => {
  await withJsdomWindow(async (dom) => {
    const React = await import("react");
    const { render, cleanup } = await import("@testing-library/react");
    const { vite, anchoring } = await loadModules();
    function Host() {
      anchoring.usePopoverAnchoring();
      return null;
    }
    render(React.createElement(Host));
    try {
      const popover = dom.window.document.createElement("div");
      popover.id = "orphan-popover";
      popover.setAttribute("popover", "");
      let hidden = 0;
      Object.defineProperty(popover, "hidePopover", {
        value: () => {
          hidden += 1;
        },
      });
      dom.window.document.body.append(popover);
      const event = new dom.window.Event("toggle");
      Object.defineProperty(event, "newState", { value: "open" });
      popover.dispatchEvent(event);
      assert.equal(hidden, 1);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
