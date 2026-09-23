// Recorded scenarios for the golden master (src/logic/golden-master.test.ts). Each one is a
// seed plus the decisions a player makes. Add scenarios freely; never edit an existing one to
// make a failing comparison pass.
import type { Scenario, ScenarioStep } from "../replay.ts";

const pick = (...names: string[]): ScenarioStep[] =>
  names.map((player) => ({ do: "pick", player }));
const choose = (option: 0 | 1): ScenarioStep => ({ do: "choose", option });
const autoFill: ScenarioStep = { do: "autoFill" };
const completeStage: ScenarioStep = { do: "completeStage" };
const undo: ScenarioStep = { do: "undo" };
const start: ScenarioStep = { do: "start" };

// A random fill in both stages with fixed event choices; the seeds were picked so that together
// these scenarios reach every tournament outcome.
function randomRun(
  name: string,
  seed: number,
  system: "4231" | "3421" | "433",
  priority: "balance" | "form" | "quality",
  choices: [0 | 1, 0 | 1, 0 | 1],
): Scenario {
  return {
    name,
    seed,
    steps: [
      { do: "setSystem", value: system },
      { do: "setPriority", value: priority },
      start,
      autoFill,
      ...choices.map(choose),
      completeStage,
      autoFill,
      completeStage,
    ],
  };
}

export const SCENARIOS: Scenario[] = [
  {
    name: "manual-4231-balance",
    seed: 2028,
    steps: [
      start,
      ...pick(
        "Łukasz Skorupski",
        "Kamil Grabara",
        "Jakub Kiwior",
        "Jan Bednarek",
        "Matty Cash",
        "Jakub Kamiński",
      ),
      ...pick("Jakub Kamiński", "Jakub Kamiński"),
      ...pick("Kamil Piątkowski", "Przemysław Wiśniewski", "Jan Ziółkowski"),
      choose(0),
      undo,
      choose(1),
      ...pick(
        "Przemysław Frankowski",
        "Piotr Zieliński",
        "Nicola Zalewski",
        "Sebastian Szymański",
        "Jakub Moder",
        "Bartosz Slisz",
        "Kacper Kozłowski",
        "Kacper Urbański",
      ),
      choose(1),
      ...pick(
        "Michał Skóraś",
        "Robert Lewandowski",
        "Karol Świderski",
        "Adam Buksa",
        "Krzysztof Piątek",
      ),
      choose(0),
      ...pick("Dominik Marczuk"),
      autoFill,
      completeStage,
      ...pick(
        "Łukasz Skorupski",
        "Kamil Grabara",
        "Marcin Bułka",
        "Jakub Kiwior",
        "Jan Bednarek",
        "Matty Cash",
        "Jakub Kamiński",
        "Kamil Piątkowski",
        "Przemysław Wiśniewski",
        "Przemysław Frankowski",
        "Bartłomiej Wdowik",
        "Piotr Zieliński",
        "Nicola Zalewski",
        "Sebastian Szymański",
        "Jakub Moder",
        "Bartosz Slisz",
        "Kacper Kozłowski",
        "Kacper Urbański",
        "Michał Skóraś",
        "Maxi Oyedele",
        "Robert Lewandowski",
        "Karol Świderski",
        "Adam Buksa",
        "Krzysztof Piątek",
        "Dominik Marczuk",
        "Dawid Kownacki",
      ),
      completeStage,
      undo,
      completeStage,
    ],
  },
  {
    name: "mixed-433-quality",
    seed: 99,
    steps: [
      { do: "setSystem", value: "433" },
      { do: "setPriority", value: "quality" },
      start,
      { do: "setSystem", value: "3421" },
      undo,
      ...pick(
        "Bartosz Mrozek",
        "Paweł Wszołek",
        "Kamil Grosicki",
        "Adam Buksa",
      ),
      autoFill,
      choose(1),
      choose(1),
      choose(0),
      completeStage,
      ...pick(
        "Łukasz Skorupski",
        "Kamil Grabara",
        "Marcin Bułka",
        "Bartłomiej Drągowski",
      ),
      autoFill,
      ...pick("Bartłomiej Drągowski"),
      autoFill,
      completeStage,
    ],
  },
  randomRun("random-3421-balance", 1, "3421", "balance", [1, 0, 0]),
  randomRun("random-433-balance", 2, "433", "balance", [0, 1, 0]),
  randomRun("random-3421-form", 4, "3421", "form", [0, 0, 1]),
  randomRun("random-3421-quality", 7, "3421", "quality", [1, 1, 1]),
  randomRun("random-4231-balance", 27, "4231", "balance", [1, 1, 0]),
  randomRun("random-3421-form-top", 67, "3421", "form", [1, 1, 0]),
];
