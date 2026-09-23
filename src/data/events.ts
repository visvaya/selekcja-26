import { GAME_RULES } from "./constants.ts";
import type { Effects } from "./types.ts";

export type EventId = "doctor" | "captain" | "scout";

export interface CampEvent {
  id: EventId;
  atPlayers: number;
  choices: [Partial<Effects>, Partial<Effects>];
}

export const EVENTS: CampEvent[] = [
  {
    id: "doctor",
    atPlayers: GAME_RULES.eventThresholdPlayers.doctor,
    choices: [
      { fit: 4, quality: -1 },
      { fit: -3, quality: 2 },
    ],
  },
  {
    id: "captain",
    atPlayers: GAME_RULES.eventThresholdPlayers.captain,
    choices: [
      { chem: 5, quality: -1 },
      { chem: -2, quality: 3 },
    ],
  },
  {
    id: "scout",
    atPlayers: GAME_RULES.eventThresholdPlayers.scout,
    choices: [
      { quality: 2, fit: -1 },
      { chem: 3, quality: 0 },
    ],
  },
];
