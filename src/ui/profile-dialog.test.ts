import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import type { Player } from "../data/types.ts";
import { preferredFoot } from "../logic/selection.ts";
import { modelScore } from "../logic/scoring.ts";
import { createInitialState } from "../logic/state.ts";
import { scoreBand } from "./score-band.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";
import { renderComponent, renderGameApp } from "./test-render-game-app.ts";

const state = createInitialState(5);
const twoFooted = players.find((player) => preferredFoot(player) === "both")!;
const leftFooted = players.find(
  (player) =>
    preferredFoot(player) === "left" && player.roles.includes("leftFoot"),
)!;

async function withProfile(
  player: Player,
  body: (panel: HTMLElement) => void,
): Promise<void> {
  await withJsdomWindow(async () => {
    const { vite, view, cleanup } = await renderComponent(
      "/src/ui/profile-dialog.tsx",
      "ProfileDialog",
      {
        player,
        state,
        onClose: () => {},
        onToggle: () => {},
        restoreFocusFallback: () => {},
      },
    );
    try {
      body(view.baseElement.querySelector<HTMLElement>('[role="dialog"]')!);
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

test("the profile header: eyebrow, name, club line and the band-coloured score", async () => {
  await withProfile(twoFooted, (panel) => {
    const eyebrow = panel.querySelector(".eyebrow")!;
    const heading = panel.querySelector("h2")!;
    assert.equal(eyebrow.textContent, "Profil");
    assert.equal(heading.textContent, twoFooted.name);
    assert.equal(
      Boolean(
        eyebrow.compareDocumentPosition(heading) &
        heading.ownerDocument.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      true,
    );
    const score = modelScore(twoFooted, state);
    const value = panel.querySelector(".profile-score b")!;
    assert.equal(value.textContent, String(score));
    assert.equal(value.classList.contains(`score-${scoreBand(score)}`), true);
    assert.equal(
      (panel.textContent ?? "").split("Ocena selekcyjna").length - 1,
      1,
    );
  });
});

test("the profile facts and the seven meters in the design order", async () => {
  await withProfile(twoFooted, (panel) => {
    const facts = panel.querySelector("dl.profile-facts")!;
    assert.deepEqual(
      [...facts.querySelectorAll("dt")].map((dt) => dt.textContent),
      ["Pozycje", "Noga wiodąca", "Cechy"],
    );
    assert.equal(facts.querySelectorAll("dd")[1]!.textContent, "obie");
    const meters = [...panel.querySelectorAll("progress")];
    assert.deepEqual(
      meters.map((meter) => meter.getAttribute("aria-label")!.split(":")[0]),
      [
        "Jakość",
        "Forma",
        "Zdrowie",
        "Taktyka",
        "Doświadczenie",
        "Zgranie kadrowe",
        "Wpływ na grupę",
      ],
    );
    assert.equal(
      meters[0]!.getAttribute("aria-label"),
      `Jakość: ${twoFooted.ov}`,
    );
    assert.equal(panel.textContent?.includes("Forma i rytm"), false);
  });
});

test("a left-footed profile says lewa and shows no foot tag", async () => {
  await withProfile(leftFooted, (panel) => {
    const facts = panel.querySelector("dl.profile-facts")!;
    assert.equal(facts.querySelectorAll("dd")[1]!.textContent, "lewa");
    const tags = [...panel.querySelectorAll(".tag")].map(
      (tag) => tag.textContent,
    );
    assert.equal(tags.includes("Lewa noga"), false);
  });
});

test("a call-up from the profile closes it and focus returns to the strip", async () => {
  await withJsdomWindow(async (dom) => {
    const { fireEvent, cleanup, vite, view } = await renderGameApp(dom);
    try {
      fireEvent.click(
        await view.findByRole("button", { name: "Rozpocznij odprawę" }),
      );
      const opener = (
        await view.findAllByRole("button", { name: /^Profil: / })
      )[0]!;
      fireEvent.click(opener);
      fireEvent.click(view.getByRole("button", { name: "Powołaj do kadry" }));
      assert.equal(dom.window.document.querySelector(".modal"), null);
      assert.equal(dom.window.document.activeElement === opener, true);
      assert.equal(
        dom.window.document.querySelectorAll(".player.selected").length,
        1,
      );
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
