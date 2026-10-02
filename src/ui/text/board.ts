import type { GroupPosition, Stage } from "../../data/types.ts";
import { plural } from "./polish-format.ts";

export const BOARD_TEXT = {
  groups: {
    BR: "Bramkarze",
    OBR: "Obrońcy",
    POM: "Pomocnicy",
    ATA: "Napastnicy",
  } satisfies Record<GroupPosition, string>,
  groupShort: {
    BR: "BR",
    OBR: "OBR",
    POM: "POM",
    ATA: "NAP",
  } satisfies Record<GroupPosition, string>,
  boardRegion: {
    camp: "Tablica kadry – zgrupowanie",
    final: "Tablica kadry – kadra turniejowa",
  } satisfies Record<Stage, string>,
  slotGroupLabel: (short: string, count: number, required: number) =>
    `${short} ${count}/${required}`,
  slotGroupAboveMinimum: (short: string, count: number, minimum: number) =>
    `${short} ${count} (min. ${minimum})`,
  freeSlots: (count: number, size: number) => `Dowolne ${count}/${size}`,
  outsideMarker: (count: number) => `W tym poza ustawieniem: ${count}`,
  excessMarker: (count: number) => `W tym ponad limit: ${count}`,
  excessReason: (detail: string) => `W tym ponad limit: ${detail}.`,
  exactGoalkeepers: (count: number) =>
    `Turniej wymaga dokładnie ${count} bramkarzy.`,
  groupPlayers: {
    BR: (count: number) =>
      `${count} ${plural(count, "bramkarz", "bramkarzy", "bramkarzy")}`,
    OBR: (count: number) =>
      `${count} ${plural(count, "obrońca", "obrońców", "obrońców")}`,
    POM: (count: number) =>
      `${count} ${plural(count, "pomocnik", "pomocników", "pomocników")}`,
    ATA: (count: number) =>
      `${count} ${plural(count, "napastnik", "napastników", "napastników")}`,
  } satisfies Record<GroupPosition, (count: number) => string>,
  outOfFormation: "Poza ustawieniem",
  pitchDescription:
    "Liczby pokazują, ilu powołanych może grać na danej pozycji.",
  dockOpen: "Dotknij, aby zobaczyć podział miejsc",
  dockCoverage: "Dotknij, aby zobaczyć obsadę",
  missing: (count: number, group: string) => `brakuje ${count} × ${group}`,
  excess: (count: number, group: string) =>
    `jest o ${count} × ${group} za dużo`,
  remaining: (count: number) =>
    `${plural(count, "Zostało", "Zostały", "Zostało")} ${count} ${plural(count, "miejsce", "miejsca", "miejsc")}`,
  outOfFormationCount: (count: number) => `${count} poza ustawieniem`,
  outOfFormationTitle: (count: number) => `Poza ustawieniem: ${count}`,
  occupied: (count: number, position: string) =>
    `${position}: ${count} ${plural(count, "powołany", "powołanych", "powołanych")}`,
} as const;
