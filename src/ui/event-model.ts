import { EVENTS } from "../data/events.ts";
import type { EventId } from "../data/events.ts";
import type { Effects } from "../data/types.ts";

export type EffectChip = {
  metric: "risk" | "quality" | "chemistry";
  direction: "up" | "down";
  good: boolean;
};

// Fitness is shown as injury risk, so its direction is inverted.
export function effectChips(effects: Partial<Effects>): EffectChip[] {
  const entries: [EffectChip["metric"], number][] = [
    ["risk", -(effects.fit ?? 0)],
    ["quality", effects.quality ?? 0],
    ["chemistry", effects.chem ?? 0],
  ];
  return entries
    .filter(([, delta]) => delta !== 0)
    .map(([metric, delta]) => {
      const up = delta > 0;
      return {
        metric,
        direction: up ? "up" : "down",
        good: metric === "risk" ? !up : up,
      };
    });
}

export function eventOrdinal(id: EventId): {
  atPlayers: number;
  index: number;
  total: number;
} {
  const index = EVENTS.findIndex((event) => event.id === id);
  return {
    atPlayers: EVENTS[index]!.atPlayers,
    index: index + 1,
    total: EVENTS.length,
  };
}
