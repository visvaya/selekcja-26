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
        "lukasz-skorupski",
        "kamil-grabara",
        "jakub-kiwior",
        "jan-bednarek",
        "matty-cash",
        "jakub-kaminski",
      ),
      ...pick("jakub-kaminski", "jakub-kaminski"),
      ...pick("kamil-piatkowski", "przemyslaw-wisniewski", "jan-ziolkowski"),
      choose(0),
      undo,
      choose(1),
      ...pick(
        "przemyslaw-frankowski",
        "piotr-zielinski",
        "nicola-zalewski",
        "sebastian-szymanski",
        "jakub-moder",
        "bartosz-slisz",
        "kacper-kozlowski",
        "kacper-urbanski",
      ),
      choose(1),
      ...pick(
        "michal-skoras",
        "robert-lewandowski",
        "karol-swiderski",
        "adam-buksa",
        "krzysztof-piatek",
      ),
      choose(0),
      ...pick("dominik-marczuk"),
      autoFill,
      completeStage,
      ...pick(
        "lukasz-skorupski",
        "kamil-grabara",
        "marcin-bulka",
        "jakub-kiwior",
        "jan-bednarek",
        "matty-cash",
        "jakub-kaminski",
        "kamil-piatkowski",
        "przemyslaw-wisniewski",
        "przemyslaw-frankowski",
        "bartlomiej-wdowik",
        "piotr-zielinski",
        "nicola-zalewski",
        "sebastian-szymanski",
        "jakub-moder",
        "bartosz-slisz",
        "kacper-kozlowski",
        "kacper-urbanski",
        "michal-skoras",
        "maxi-oyedele",
        "robert-lewandowski",
        "karol-swiderski",
        "adam-buksa",
        "krzysztof-piatek",
        "dominik-marczuk",
        "dawid-kownacki",
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
        "bartosz-mrozek",
        "pawel-wszolek",
        "kamil-grosicki",
        "adam-buksa",
      ),
      autoFill,
      choose(1),
      choose(1),
      choose(0),
      completeStage,
      ...pick(
        "lukasz-skorupski",
        "kamil-grabara",
        "marcin-bulka",
        "bartlomiej-dragowski",
      ),
      autoFill,
      ...pick("bartlomiej-dragowski"),
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
