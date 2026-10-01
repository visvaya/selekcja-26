import { GAME_RULES } from "../data/constants.ts";
import { detailedPositionMap, players, systems } from "../data/catalog.ts";
import { EVENTS } from "../data/events.ts";
import type { CampEvent } from "../data/events.ts";
import type {
  DetailedPosition,
  GameState,
  GroupPosition,
  Player,
  PlayerId,
} from "../data/types.ts";

export const detailedPositions = (player: Player): DetailedPosition[] =>
  player.pos === "BR" ? ["BR"] : (detailedPositionMap[player.id] ?? []);

export const positionShort = (player: Player): string =>
  detailedPositions(player).join(" / ");

const leftFooted = new Set([
  "jakub-kiwior",
  "sebastian-szymanski",
  "jakub-moder",
  "adam-buksa",
  "arkadiusz-reca",
  "tymoteusz-puchacz",
  "oskar-pietuszewski",
  "wojciech-monka",
  "kacper-potulski",
  "mateusz-zukowski",
  "bartlomiej-wdowik",
]);
const twoFooted = new Set([
  "piotr-zielinski",
  "kacper-kozlowski",
  "nicola-zalewski",
  "michal-rakoczy",
]);

export function preferredFoot(player: Player): "both" | "left" | "right" {
  return twoFooted.has(player.id)
    ? "both"
    : leftFooted.has(player.id)
      ? "left"
      : "right";
}

export function selectedPlayers(state: GameState): Player[] {
  return players.filter((player) => state.selected.has(player.id));
}

export function groupCounts(state: GameState): Record<GroupPosition, number> {
  const counts: Record<GroupPosition, number> = {
    BR: 0,
    OBR: 0,
    POM: 0,
    ATA: 0,
  };
  for (const player of selectedPlayers(state)) counts[player.pos] += 1;
  return counts;
}

export function detailedCounts(
  state: GameState,
): Record<DetailedPosition, number> {
  const counts = Object.fromEntries(
    (
      [
        "BR",
        "LO",
        "LŚO",
        "ŚO",
        "PŚO",
        "PO",
        "LWO",
        "DP",
        "ŚP",
        "OP",
        "PWO",
        "LS",
        "N",
        "PS",
      ] as DetailedPosition[]
    ).map((position) => [position, 0]),
  ) as Record<DetailedPosition, number>;
  for (const player of selectedPlayers(state))
    for (const position of detailedPositions(player)) counts[position] += 1;
  return counts;
}

export function squadLimit(state: GameState): number {
  return GAME_RULES[state.stage].squadSizePlayers;
}

export function squadProblems(
  state: GameState,
): { group: GroupPosition; count: number; kind: "missing" | "excess" }[] {
  const requirements = GAME_RULES[state.stage].minimumPlayersByGroup;
  const counts = groupCounts(state);
  const issues: {
    group: GroupPosition;
    count: number;
    kind: "missing" | "excess";
  }[] = [];
  for (const group of Object.keys(requirements) as GroupPosition[]) {
    if (counts[group] < requirements[group])
      issues.push({
        group,
        count: requirements[group] - counts[group],
        kind: "missing",
      });
  }
  if (state.stage === "final" && counts.BR > requirements.BR)
    issues.push({
      group: "BR",
      count: counts.BR - requirements.BR,
      kind: "excess",
    });
  return issues;
}

export function canFinalize(state: GameState): boolean {
  return (
    state.selected.size === squadLimit(state) &&
    squadProblems(state).length === 0
  );
}

export function formationOutsiders(state: GameState): Player[] {
  const system = systems.find((candidate) => candidate.id === state.system)!;
  return selectedPlayers(state).filter(
    (player) =>
      !detailedPositions(player).some((position) =>
        system.fits.includes(position),
      ),
  );
}

export function slotCount(
  state: GameState,
  position: DetailedPosition,
): number {
  const alternatives: DetailedPosition[] =
    position === "LŚO"
      ? ["LŚO", "ŚO"]
      : position === "PŚO"
        ? ["PŚO", "ŚO"]
        : [position];
  return selectedPlayers(state).filter((player) =>
    detailedPositions(player).some((candidate) =>
      alternatives.includes(candidate),
    ),
  ).length;
}

export function riskLevel(
  state: GameState,
): "none" | "low" | "medium" | "high" {
  const squad = selectedPlayers(state);
  if (!squad.length) return "none";
  const rules = GAME_RULES.risk;
  const risk =
    squad.reduce(
      (total, player) =>
        total +
        (GAME_RULES.ratingMaximumPoints - player.fit) +
        (player.flag ? rules.flagPenaltyPoints : 0),
      0,
    ) /
      squad.length -
    state.effects.fit;
  return risk < rules.lowThresholdPoints
    ? "low"
    : risk < rules.mediumThresholdPoints
      ? "medium"
      : "high";
}

// The first camp event whose threshold is reached and which is still unresolved. While it is
// pending the player must decide before picking further players or closing the camp.
export function pendingCampEvent(state: GameState): CampEvent | undefined {
  return state.stage === "camp" && state.started
    ? EVENTS.find(
        (event) =>
          state.selected.size >= event.atPlayers && !state.events.has(event.id),
      )
    : undefined;
}

// Catalogue players for the given IDs in catalogue order. IDs that are no longer in the
// catalogue are skipped, so a frozen report still renders after a player is removed.
export function playersByIds(ids: readonly PlayerId[]): Player[] {
  const wanted = new Set(ids);
  return players.filter((player) => wanted.has(player.id));
}
