import test from "node:test";
import assert from "node:assert/strict";
import { players } from "../data/catalog.ts";
import { APP_CONFIG, GAME_RULES, RULES_REVISION } from "../data/constants.ts";
import { tournamentStory } from "../logic/tournament.ts";
import type { GroupPosition, OutcomeId, Player } from "../data/types.ts";
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
      // The group line nests its three matches; knockout rounds follow at the top level.
      const groupLine = view.container.querySelector(".report > ul > li");
      assert.match(
        groupLine?.firstChild?.textContent ?? "",
        /^Faza grupowa: \d+ pkt$/,
      );
      assert.equal(groupLine?.querySelectorAll("ul > li").length, 3);
      fireEvent.click(
        screen.getByRole("button", { name: "Zagraj od początku" }),
      );
      const introHeading = screen.getByRole("heading", {
        name: "Bilet na EURO",
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
      fireEvent.click(
        view.getByRole("radio", {
          name: new RegExp(`^${UI_TEXT.systems["3421"].name} `),
        }),
      );
      fireEvent.click(
        view.getByRole("radio", {
          name: new RegExp(`^${UI_TEXT.systems["433"].name} `),
        }),
      );

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

const REPORT_BASE = {
  squadIds: ["robert-lewandowski"],
  quality: 74,
  chem: 70,
  coverage: 90,
  luck: 0,
  strengths: [],
  weak: [],
};

// Boots the app from a saved finished report and returns the tournament path lines: the
// group line's own nested match lines, every top-level line's own text, and every
// top-level row's full text including its markers.
async function renderSavedReport(report: Record<string, unknown>) {
  return withJsdomWindow(async (dom) => {
    dom.window.localStorage.setItem(
      APP_CONFIG.storageKey,
      JSON.stringify({
        schemaVersion: APP_CONFIG.saveSchemaVersion,
        rulesRevision: RULES_REVISION,
        state: {
          system: "433",
          stage: "final",
          started: true,
          selected: [],
          campSquad: [],
          trial: {},
          list: {
            positions: [],
            query: "",
            sort: "model",
            foot: { left: false, right: false },
            traits: [],
            ranges: {},
            onlySelected: false,
            onlyCamp: false,
          },
          events: [],
          effects: { chem: 0, fit: 0, quality: 0 },
          compare: [],
          seed: 3,
          report: { rulesRevision: RULES_REVISION, ...REPORT_BASE, ...report },
          history: [],
        },
      }),
    );
    const { act, cleanup, vite, view } = await renderGameApp(dom);
    try {
      await view.findByRole("heading", { name: "Przebieg turnieju" });
      const path = view.container.querySelector(".report > ul")!;
      const nested = [...path.querySelectorAll(":scope > li > ul > li")].map(
        (item) => item.textContent ?? "",
      );
      const top = [...path.querySelectorAll(":scope > li")].map(
        (item) => item.firstChild?.textContent ?? "",
      );
      const rows = [...path.querySelectorAll(":scope > li")].map(
        (item) => item.textContent ?? "",
      );
      await act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
      });
      return { nested, top, rows };
    } finally {
      cleanup();
      await vite.close();
    }
  });
}

test("a group-exit report nests three matches and marks the last one", async () => {
  const story = tournamentStory("group", 1, 77, UI_TEXT.tournament);
  const { nested, top } = await renderSavedReport({
    points: 1,
    stage: UI_TEXT.outcomes.group,
    grade: "C",
    story,
  });
  assert.equal(top.length, 1);
  assert.equal(top[0], UI_TEXT.tournament.groupPoints(1));
  assert.equal(nested.length, 3);
  for (const line of nested) assert.match(line, /^Polska \d+:\d+ /);
  assert.equal(nested[2]!.endsWith(" Odpadliśmy"), true);
  assert.equal(nested.slice(0, 2).join().includes("Odpadliśmy"), false);
});

test("a legacy report keeps its flat tournament lines", async () => {
  const { nested, top } = await renderSavedReport({
    points: 5,
    stage: UI_TEXT.outcomes.roundOf16,
    grade: "B",
    story: {
      matches: ["Faza grupowa: 5 pkt", "1/8 finału: Polska 0:1 Dania"],
      outcome: "Polska odpadła w 1/8 finału.",
      last: "Polska 0:1 Dania",
      seed: 9,
    },
  });
  assert.deepEqual(nested, []);
  assert.deepEqual(top, [
    "Faza grupowa: 5 pkt",
    "1/8 finału: Polska 0:1 Dania",
  ]);
});

const MARKER_CASES: readonly {
  outcome: OutcomeId;
  points: number;
  marker: string | null;
  place: 1 | 2 | null;
}[] = [
  { outcome: "group", points: 0, marker: null, place: null },
  { outcome: "group", points: 1, marker: null, place: null },
  { outcome: "group", points: 3, marker: null, place: null },
  { outcome: "roundOf16", points: 5, marker: "eliminated", place: null },
  { outcome: "quarterfinal", points: 5, marker: "eliminated", place: null },
  { outcome: "semifinal", points: 7, marker: "semifinal", place: null },
  { outcome: "runnerUp", points: 7, marker: null, place: 2 },
  { outcome: "champion", points: 9, marker: null, place: 1 },
];

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

for (const { outcome, points, marker, place } of MARKER_CASES) {
  test(`a ${outcome} report with ${points} points marks the right row`, async () => {
    const t = UI_TEXT.tournament;
    const story = tournamentStory(outcome, points, 77, t);
    const { nested, rows } = await renderSavedReport({
      points,
      stage: UI_TEXT.outcomes[outcome],
      grade: "4",
      story,
    });
    const all = rows.join("|");
    const last = rows[rows.length - 1]!;
    if (outcome === "group") {
      assert.equal(rows.length, 1);
      assert.equal(occurrences(all, t.eliminatedMarker), 1);
      assert.equal(nested[2]!.endsWith(` ${t.eliminatedMarker}`), true);
      assert.equal(all.includes(t.semifinalLossMarker), false);
      assert.equal(all.includes(t.placeMarker(1)), false);
      assert.equal(all.includes(t.placeMarker(2)), false);
      return;
    }
    if (marker === "eliminated") {
      assert.equal(occurrences(all, t.eliminatedMarker), 1);
      assert.equal(last.endsWith(` ${t.eliminatedMarker}`), true);
      assert.equal(all.includes(t.semifinalLossMarker), false);
    } else if (marker === "semifinal") {
      assert.equal(occurrences(all, t.semifinalLossMarker), 1);
      assert.equal(last.endsWith(` ${t.semifinalLossMarker}`), true);
      assert.equal(all.includes(t.eliminatedMarker), false);
    } else {
      assert.equal(all.includes(t.eliminatedMarker), false);
      assert.equal(all.includes(t.semifinalLossMarker), false);
    }
    if (place !== null) {
      assert.equal(occurrences(all, t.placeMarker(place)), 1);
      assert.equal(last.endsWith(` ${t.placeMarker(place)}`), true);
    }
  });
}
