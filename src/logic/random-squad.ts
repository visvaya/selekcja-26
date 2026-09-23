import { players } from "../data/catalog.ts";
import { GAME_RULES } from "../data/constants.ts";
import type { GameState, GroupPosition, Player } from "../data/types.ts";
import { nextRandom } from "./random.ts";

export type RandomSquadResult =
  | { ok: true; selected: Set<string>; seed: number }
  | {
      ok: false;
      reason:
        | "full"
        | "insufficientSlots"
        | "candidateShortage"
        | "tooManyGoalkeepers";
    };

export function fillSquadRandomly(state: GameState): RandomSquadResult {
  const rules = GAME_RULES[state.stage];
  const availableSlots = rules.squadSizePlayers - state.selected.size;
  if (availableSlots <= 0) return { ok: false, reason: "full" };

  const selected = new Set(state.selected);
  const groups: GroupPosition[] = ["BR", "OBR", "POM", "ATA"];
  const counts = Object.fromEntries(
    groups.map((group) => [
      group,
      players.filter(
        (player) => selected.has(player.id) && player.pos === group,
      ).length,
    ]),
  ) as Record<GroupPosition, number>;
  if (state.stage === "final" && counts.BR > rules.minimumPlayersByGroup.BR)
    return { ok: false, reason: "tooManyGoalkeepers" };
  const missingSlots = groups.reduce(
    (sum, group) =>
      sum + Math.max(0, rules.minimumPlayersByGroup[group] - counts[group]),
    0,
  );
  if (missingSlots > availableSlots)
    return { ok: false, reason: "insufficientSlots" };

  let seed = state.seed;
  function choose(pool: Player[]): Player | undefined {
    if (!pool.length) return undefined;
    const draw = nextRandom(seed);
    seed = draw.seed;
    return pool[Math.floor(draw.value * pool.length)];
  }
  for (const group of groups) {
    while (counts[group] < rules.minimumPlayersByGroup[group]) {
      const candidate = choose(
        players.filter(
          (player) => player.pos === group && !selected.has(player.id),
        ),
      );
      if (!candidate) return { ok: false, reason: "candidateShortage" };
      selected.add(candidate.id);
      counts[group] += 1;
    }
  }
  while (selected.size < rules.squadSizePlayers) {
    const candidate = choose(
      players.filter(
        (player) => player.pos !== "BR" && !selected.has(player.id),
      ),
    );
    if (!candidate) return { ok: false, reason: "candidateShortage" };
    selected.add(candidate.id);
  }
  return { ok: true, selected, seed };
}
