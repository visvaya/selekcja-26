import type { GroupPosition } from "../../data/types.ts";

export const BOARD_TEXT = {
  groups: {
    BR: "Bramkarze",
    OBR: "Obrońcy",
    POM: "Pomocnicy",
    ATA: "Napastnicy",
  } satisfies Record<GroupPosition, string>,
  outOfFormation: "Poza ustawieniem",
  availablePlayers: "liczba dostępnych",
  pitchDescription:
    "Liczby pokazują, ilu powołanych może grać na danej pozycji.",
  dockOpen: "Dotknij, aby zobaczyć podział miejsc",
  dockCoverage: "Dotknij, aby zobaczyć obsadę",
  missing: (count: number, group: string) => `brakuje ${count} × ${group}`,
  excess: (count: number, group: string) =>
    `jest o ${count} × ${group} za dużo`,
  remaining: (count: number) => `Zostało ${count} miejsc`,
  outOfFormationCount: (count: number) => `${count} poza ustawieniem`,
  outOfFormationTitle: (count: number) => `Poza ustawieniem: ${count}`,
  occupied: (count: number, position: string) =>
    `${position}: ${count} powołanych`,
  exact: "dokładnie",
  minimum: "min.",
  missingShort: (count: number) => `Brakuje ${count}`,
  excessShort: (count: number) => `O ${count} za dużo`,
  fulfilled: "✓ Spełnione",
} as const;
