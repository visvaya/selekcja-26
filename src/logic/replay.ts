// Headless replay of recorded scenarios through the same pure functions the UI calls. The
// golden master test compares the resulting traces byte for byte with the files in
// src/logic/golden/traces, so any change in ratings, draws, events or results shows up there.
import { players } from "../data/catalog.ts";
import type { SystemId } from "../data/types.ts";
import { fillSquadRandomly } from "./random-squad.ts";
import { buildFinalReport, reportReasons } from "./report.ts";
import type { ReportCopy } from "./report.ts";
import { evaluateSquad } from "./results.ts";
import { modelScore } from "./scoring.ts";
import {
  canFinalize,
  pendingCampEvent,
  riskLevel,
  selectedPlayers,
  squadLimit,
} from "./selection.ts";
import { createInitialState, reduceGameState } from "./state.ts";
import type { GameState } from "../data/types.ts";

export type ScenarioStep =
  | { do: "setSystem"; value: SystemId }
  | { do: "start" }
  | { do: "pick"; player: string }
  | { do: "autoFill" }
  | { do: "choose"; option: 0 | 1 }
  | { do: "completeStage" }
  | { do: "undo" };

export interface Scenario {
  name: string;
  seed: number;
  steps: ScenarioStep[];
}

const playerKey = (player: { id: string }): string => player.id;

function ratings(state: GameState): Record<string, number> {
  return Object.fromEntries(
    players.map((player) => [playerKey(player), modelScore(player, state)]),
  );
}

function digest(state: GameState) {
  return {
    stage: state.stage,
    started: state.started,
    system: state.system,
    seed: state.seed,
    selected: selectedPlayers(state).map(playerKey),
    events: [...state.events],
    effects: state.effects,
    risk: riskLevel(state),
    canFinalize: canFinalize(state),
    pendingEvent: pendingCampEvent(state)?.id ?? null,
    historyLength: state.history.length,
    finished: state.report !== null,
  };
}

function fail(scenario: Scenario, index: number, message: string): never {
  throw new Error(`Scenario "${scenario.name}", step ${index}: ${message}`);
}

function assertNoPendingEvent(
  scenario: Scenario,
  index: number,
  state: GameState,
) {
  if (pendingCampEvent(state))
    fail(scenario, index, "a camp event must be resolved first");
}

// Applies one step the way the UI would; returns the next state and the extra trace data the
// step produced (ratings before a stage closes, camp trials, the final evaluation).
function applyStep(
  scenario: Scenario,
  index: number,
  state: GameState,
  step: ScenarioStep,
  copy: ReportCopy,
): { state: GameState; extra?: Record<string, unknown> } {
  switch (step.do) {
    case "setSystem":
      return {
        state: reduceGameState(state, {
          type: "setSystem",
          value: step.value,
        }),
      };
    case "start":
      return {
        state: reduceGameState(state, { type: "start" }),
        extra: { ratings: ratings(state) },
      };
    case "undo":
      return { state: reduceGameState(state, { type: "undo" }) };
    case "pick": {
      assertNoPendingEvent(scenario, index, state);
      const player = players.find(
        (candidate) => playerKey(candidate) === step.player,
      );
      if (!player) fail(scenario, index, `unknown player ${step.player}`);
      return {
        state: reduceGameState(state, {
          type: "togglePlayer",
          id: playerKey(player),
          limit: squadLimit(state),
        }),
      };
    }
    case "autoFill": {
      assertNoPendingEvent(scenario, index, state);
      const result = fillSquadRandomly(state);
      return result.ok
        ? {
            state: reduceGameState(state, {
              type: "autoFill",
              selected: result.selected,
              seed: result.seed,
            }),
          }
        : { state, extra: { rejected: result.reason } };
    }
    case "choose": {
      const event = pendingCampEvent(state);
      if (!event) fail(scenario, index, "no camp event is pending");
      return {
        state: reduceGameState(state, {
          type: "resolveEvent",
          id: event.id,
          effects: event.choices[step.option],
        }),
      };
    }
    case "completeStage": {
      assertNoPendingEvent(scenario, index, state);
      if (!canFinalize(state))
        fail(scenario, index, "the squad cannot be finalized");
      if (state.stage === "camp") {
        const next = reduceGameState(state, {
          type: "completeCamp",
          squad: selectedPlayers(state),
        });
        return {
          state: next,
          extra: {
            ratings: ratings(state),
            trial: Object.fromEntries(
              selectedPlayers(state).map((player) => [
                playerKey(player),
                next.trial[playerKey(player)],
              ]),
            ),
          },
        };
      }
      const { squad: _squad, ...evaluation } = evaluateSquad(state);
      const { report, seed } = buildFinalReport(state, copy);
      return {
        state: reduceGameState(state, { type: "finish", report, seed }),
        extra: {
          ratings: ratings(state),
          evaluation,
          reasons: reportReasons(evaluateSquad(state)),
          story: report.story,
        },
      };
    }
  }
}

export function replayScenario(scenario: Scenario, copy: ReportCopy) {
  let state = createInitialState(scenario.seed);
  const steps = scenario.steps.map((step, index) => {
    const result = applyStep(scenario, index, state, step, copy);
    state = result.state;
    return { step, ...result.extra, state: digest(state) };
  });
  return { name: scenario.name, seed: scenario.seed, steps };
}

// One step per line keeps diffs of regenerated traces readable while staying plain JSON.
export function formatTrace(trace: ReturnType<typeof replayScenario>): string {
  const lines = trace.steps.map((step) => `    ${JSON.stringify(step)}`);
  return `{\n  "name": ${JSON.stringify(trace.name)},\n  "seed": ${trace.seed},\n  "steps": [\n${lines.join(",\n")}\n  ]\n}\n`;
}
