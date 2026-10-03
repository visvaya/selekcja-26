import test from "node:test";
import assert from "node:assert/strict";
import { players, systems } from "../data/catalog.ts";
import { APP_CONFIG } from "../data/constants.ts";
import type { GameState, Player } from "../data/types.ts";
import { encodeSave } from "../logic/save-format.ts";
import { detailedPositions } from "../logic/selection.ts";
import { createInitialState, reduceGameState } from "../logic/state.ts";
import { UI_TEXT as text } from "./text.ts";
import { UI_CONFIG } from "./ui-config.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { openBoard, renderGameApp } from "./test-render-game-app.ts";

const SYSTEM = "3421";
const fits = systems.find((system) => system.id === SYSTEM)!.fits;
const fitsSystem = (player: Player) =>
  detailedPositions(player).some((position) => fits.includes(position));

function pick(count: number, predicate: (player: Player) => boolean) {
  const found = players.filter(predicate).slice(0, count);
  assert.equal(found.length, count, "catalogue has enough players");
  return found;
}

// 3-4-2-1 in the camp with five forwards that have no position in the system; eight
// call-ups, so no camp event is pending.
const outsiders = pick(5, (p) => p.pos === "ATA" && !fitsSystem(p));
function outsidersState(): GameState {
  const squad = [
    ...pick(2, (p) => p.pos === "BR"),
    ...pick(1, (p) => p.pos === "ATA" && detailedPositions(p).includes("N")),
    ...outsiders,
  ];
  const started = reduceGameState(
    reduceGameState(createInitialState(7), {
      type: "setSystem",
      value: SYSTEM,
    }),
    { type: "start" },
  );
  return {
    ...started,
    history: [],
    selected: new Set(squad.map((player) => player.id)),
  };
}

type Rendered = Awaited<ReturnType<typeof renderGameApp>>;

async function withOutsiders(
  wide: boolean,
  body: (app: Rendered, dialog: () => HTMLElement) => Promise<void>,
) {
  await withJsdomWindow(async (dom) => {
    const win = dom.window as unknown as Window & typeof globalThis;
    win.matchMedia = ((query: string) => ({
      matches: wide && query === UI_CONFIG.wideLayoutQuery,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    dom.window.localStorage.setItem(
      APP_CONFIG.storageKey,
      encodeSave(outsidersState()),
    );
    const app = await renderGameApp(dom);
    try {
      await app.waitFor(() => {
        if (!app.view.container.querySelector(".pitch-outsiders"))
          throw new Error("The game has not loaded");
      });
      if (!wide) await openBoard(app.view);
      const opener = app.view.container.querySelector<HTMLButtonElement>(
        wide
          ? ".side-board button.pitch-outsiders, button.pitch-outsiders"
          : ".phone-dock button.pitch-outsiders",
      );
      assert.ok(opener, "the outsiders button is rendered");
      opener.focus();
      app.fireEvent.click(opener);
      const dialog = () => {
        const found = dom.window.document.querySelector<HTMLElement>(
          '.modal[role="dialog"]',
        );
        if (!found) throw new Error("The outsiders dialog is not open");
        return found;
      };
      await app.waitFor(() => dialog());
      await body(app, dialog);
      await app.act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
    } finally {
      app.cleanup();
      await app.vite.close();
    }
  });
}

const removeButtons = (dialog: HTMLElement) => [
  ...dialog.querySelectorAll<HTMLButtonElement>(".squad-row .row-remove"),
];
const liveText = () =>
  [...document.querySelectorAll("[aria-live]")]
    .map((node) => node.textContent ?? "")
    .join("|");
const heading = (dialog: HTMLElement) =>
  dialog.querySelector("h2")?.textContent ?? "";

test("outsiders rows: badge, profile name button, remove X with hint, bulk button", async () => {
  await withOutsiders(false, async (app, dialog) => {
    const panel = dialog();
    assert.equal(heading(panel), "Poza ustawieniem: 5");
    const rows = [
      ...panel.querySelectorAll<HTMLElement>(
        ".squad-list.outsiders-list .squad-row",
      ),
    ];
    assert.equal(rows.length, 5);
    const ids = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const player = outsiders[index]!;
      const badge = row.querySelector<HTMLButtonElement>("button.pos")!;
      ids.add(badge.getAttribute("popovertarget") ?? "");
      const name = row.querySelector<HTMLButtonElement>(".squad-name button")!;
      assert.equal(name.textContent, player.name);
      const remove = row.querySelector<HTMLButtonElement>(".row-remove")!;
      assert.equal(
        remove.getAttribute("aria-label"),
        `Odwołaj: ${player.name}`,
      );
      const tip = document.getElementById(
        remove.getAttribute("aria-describedby") ?? "",
      );
      assert.equal(
        tip?.textContent,
        "Odwołaj z kadry. Możesz to cofnąć przyciskiem „Cofnij”.",
      );
    }
    assert.equal(ids.size, 5, "each badge has its own popover");
    const bulk = panel.querySelector<HTMLButtonElement>(
      "button.action-button.outsiders-remove-all",
    )!;
    assert.equal(
      bulk.textContent?.replace(/\s+/g, " ").trim(),
      "Odwołaj wszystkich poza ustawieniem (5)",
    );
    assert.equal(
      bulk.querySelector(".keep-together")?.textContent,
      "ustawieniem (5)",
    );
    app.fireEvent.click(rows[0]!.querySelector(".squad-name button")!);
    await app.waitFor(() => {
      if (heading(dialog()) !== outsiders[0]!.name)
        throw new Error("no profile");
    });
  });
});

test("removing rows moves focus to the next, then the previous row's X", async () => {
  await withOutsiders(false, async (app, dialog) => {
    app.fireEvent.click(removeButtons(dialog())[1]!);
    assert.equal(heading(dialog()), "Poza ustawieniem: 4");
    const after = removeButtons(dialog());
    assert.equal(after.length, 4);
    assert.equal(document.activeElement === after[1], true);
    assert.equal(
      after[1]!.getAttribute("aria-label"),
      `Odwołaj: ${outsiders[2]!.name}`,
    );
    assert.equal(
      liveText().includes(
        `Odwołano: ${outsiders[1]!.name}. Możesz to cofnąć przyciskiem „Cofnij”.`,
      ),
      true,
    );
    app.fireEvent.click(after[3]!);
    const last = removeButtons(dialog());
    assert.equal(last.length, 3);
    assert.equal(document.activeElement === last[2], true);
  });
});

test("the bulk action closes the dialog, announces the count and undoes in one step (phone)", async () => {
  await withOutsiders(false, async (app) => {
    const bulk = document.querySelector<HTMLButtonElement>(
      ".outsiders-remove-all",
    )!;
    app.fireEvent.click(bulk);
    assert.equal(
      document.querySelector('.modal[role="dialog"]') === null,
      true,
    );
    assert.equal(
      liveText().includes(
        "Odwołano zawodników spoza ustawienia: 5. Możesz to cofnąć przyciskiem „Cofnij”.",
      ),
      true,
    );
    const toggle = document.querySelector(".phone-dock .phone-dock-toggle")!;
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    await app.waitFor(() => {
      if (!document.activeElement?.classList.contains("phone-dock-handle"))
        throw new Error("The sheet handle is not focused");
    });
    assert.equal(
      document.querySelector("button.pitch-outsiders") === null,
      true,
    );
    const undo = app.view.getAllByRole("button", { name: text.undo })[0]!;
    app.fireEvent.click(undo);
    await app.waitFor(() => {
      if (!document.querySelector("button.pitch-outsiders"))
        throw new Error("outsiders not restored");
    });
  });
});

// The dialog is closed and focus is on the side board region.
async function closedOnSideBoard(app: Rendered) {
  assert.equal(document.querySelector('.modal[role="dialog"]') === null, true);
  await app.waitFor(() => {
    const active = document.activeElement;
    if (
      active?.getAttribute("role") !== "region" ||
      !active.classList.contains("dock")
    )
      throw new Error("The side board region is not focused");
  });
}

test("the bulk action focuses the side board region when wide", async () => {
  await withOutsiders(true, async (app) => {
    app.fireEvent.click(
      document.querySelector<HTMLButtonElement>(".outsiders-remove-all")!,
    );
    await closedOnSideBoard(app);
  });
});

test("removing every outsider one by one closes the dialog with the same focus rule", async () => {
  await withOutsiders(true, async (app, dialog) => {
    for (let count = 5; count > 0; count -= 1)
      app.fireEvent.click(removeButtons(dialog())[0]!);
    await closedOnSideBoard(app);
    assert.equal(liveText().includes(`Odwołano: ${outsiders[4]!.name}.`), true);
  });
});
