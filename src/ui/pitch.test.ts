import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { players, systems } from "../data/catalog.ts";
import { detailedPositions, slotCount } from "../logic/selection.ts";
import { createInitialState } from "../logic/state.ts";
import { UI_TEXT as text } from "./text.ts";
import { withJsdomWindow } from "./test-jsdom-window.ts";

// `hmr: false` keeps this server off the default HMR port other test files may use.
async function loadModules() {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  const pitch = (await vite.ssrLoadModule(
    "/src/ui/pitch.tsx",
  )) as typeof import("./pitch.tsx");
  const map = (await vite.ssrLoadModule(
    "/src/ui/formation-map.tsx",
  )) as typeof import("./formation-map.tsx");
  const outsiders = (await vite.ssrLoadModule(
    "/src/ui/pitch-outsiders.tsx",
  )) as typeof import("./pitch-outsiders.tsx");
  return { vite, ...pitch, ...map, ...outsiders };
}

test("Pitch, FormationMap and PitchOutsiders render the shared pitch anatomy", async () => {
  await withJsdomWindow(async () => {
    const React = await import("react");
    const { render, cleanup, fireEvent } =
      await import("@testing-library/react");
    const { vite, Pitch, FormationMap, PitchOutsiders } = await loadModules();
    try {
      const state = {
        ...createInitialState(7),
        system: "3421" as const,
        selected: new Set(players.slice(0, 12).map((player) => player.id)),
      };
      const shape = systems.find((system) => system.id === "3421")!.shape;
      const name = text.systems["3421"].name;
      const slots = shape
        .flat()
        .map((code) =>
          text.occupied(slotCount(state, code), text.positions[code]),
        )
        .join(". ");

      const pitch = render(React.createElement(Pitch, { state }));
      const img = pitch.container.querySelector('.mini-pitch[role="img"]');
      assert.equal(
        img?.getAttribute("aria-label"),
        `${name}. ${text.pitchDescription} ${slots}`,
      );
      const label = pitch.container.querySelector(".formation-label");
      assert.equal(label?.querySelector("b")?.textContent, name);
      assert.equal(
        label?.querySelector("small")?.textContent,
        text.pitchDescription,
      );
      assert.equal(
        pitch.container
          .querySelector(".pitch-markings")
          ?.getAttribute("aria-hidden"),
        "true",
      );
      const nodes = [...pitch.container.querySelectorAll(".pitch-node")];
      assert.equal(nodes.length, shape.flat().length);
      assert.deepEqual(
        nodes.map((node) => [
          node.querySelector("small")?.textContent,
          node.querySelector("b")?.textContent,
        ]),
        shape.flat().map((code) => [code, String(slotCount(state, code))]),
      );
      cleanup();

      const map = render(React.createElement(FormationMap, { system: "433" }));
      const mapName = text.systems["433"].name;
      assert.equal(
        map.container
          .querySelector('.mini-pitch[role="img"]')
          ?.getAttribute("aria-label"),
        text.formationMap(mapName),
      );
      const mapNodes = [...map.container.querySelectorAll(".pitch-node")];
      assert.ok(mapNodes.length > 0);
      assert.ok(mapNodes.every((node) => node.querySelector("b") === null));
      cleanup();

      const empty = render(
        React.createElement(PitchOutsiders, { players: [], onOpen: () => {} }),
      );
      assert.equal(empty.container.innerHTML, "");
      cleanup();

      const five = players.slice(0, 5);
      let opened = 0;
      const strip = render(
        React.createElement(PitchOutsiders, {
          players: five,
          onOpen: () => {
            opened += 1;
          },
        }),
      );
      const buttons = strip.getAllByRole("button");
      assert.equal(buttons.length, 1);
      const button = strip.getByRole("button", {
        name: "Poza ustawieniem: 5",
      });
      assert.equal(
        button.querySelector(".pitch-outsiders-label")?.textContent,
        text.outOfFormation,
      );
      const magnets = [...button.querySelectorAll(".pitch-outsiders-magnet")];
      assert.equal(magnets.length, 5);
      magnets.forEach((magnet, index) => {
        const player = five[index]!;
        assert.equal(magnet.getAttribute("aria-hidden"), "true");
        const pos = magnet.querySelector(".pos");
        const groupClass = {
          BR: "pos-gk",
          OBR: "pos-def",
          POM: "pos-mid",
          ATA: "pos-fwd",
        }[player.pos];
        assert.ok(pos?.classList.contains(groupClass));
        const [primary, secondary] = detailedPositions(player);
        assert.equal(pos?.querySelector("b")?.textContent, primary);
        assert.equal(pos?.querySelector("small")?.textContent, secondary);
        assert.ok(
          (magnet.querySelector(".pitch-outsiders-name")?.textContent ?? "")
            .length > 0,
        );
      });
      fireEvent.click(button);
      assert.equal(opened, 1);
    } finally {
      cleanup();
      await vite.close();
    }
  });
});
