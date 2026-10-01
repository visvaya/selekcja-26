export type GroupPosition = "BR" | "OBR" | "POM" | "ATA";
export type DetailedPosition =
  | "BR"
  | "LO"
  | "LŚO"
  | "ŚO"
  | "PŚO"
  | "PO"
  | "LWO"
  | "DP"
  | "ŚP"
  | "OP"
  | "PWO"
  | "LS"
  | "N"
  | "PS";
export type SystemId = "4231" | "3421" | "433";
export type Stage = "camp" | "final";
export type OutcomeId =
  | "champion"
  | "runnerUp"
  | "semifinal"
  | "quarterfinal"
  | "roundOf16"
  | "group";

// Stable English identifiers. Polish labels for roles and flags live in src/ui/text.ts; saves
// reference players by PlayerId only, so display names can change without a migration.
export type PlayerId = string;
export type RoleId =
  | "aerial"
  | "ballPlaying"
  | "ballWinning"
  | "boxPresence"
  | "buildUp"
  | "centreBack"
  | "dribbling"
  | "experience"
  | "leader"
  | "leftFoot"
  | "linkUp"
  | "longShots"
  | "pace"
  | "playmaker"
  | "potential"
  | "pressing"
  | "reach"
  | "reflexes"
  | "rightBack"
  | "setPieces"
  | "striker"
  | "winger"
  | "wingBack";
export type AvailabilityFlagId = "injuryRisk" | "minutesLimit";

export interface Player {
  id: PlayerId;
  name: string;
  pos: GroupPosition;
  club: string;
  ov: number;
  form: number;
  fit: number;
  tact: number;
  chem: number;
  roles: RoleId[];
  age: number;
  flag: AvailabilityFlagId | null;
}

export interface System {
  id: SystemId;
  needs: RoleId[];
  shape: DetailedPosition[][];
  fits: DetailedPosition[];
}

export type TrialNoteId = "impressed" | "solid" | "uncertain" | "disappointed";
interface TrialReport {
  delta: number;
  note: TrialNoteId;
}
export interface Effects {
  chem: number;
  fit: number;
  quality: number;
}
export type KnockoutRoundId =
  "roundOf16" | "quarterfinal" | "semifinal" | "final";
export type MatchResultId = "win" | "draw" | "loss";
export interface MatchScore {
  goalsFor: number;
  goalsAgainst: number;
  penalties: { goalsFor: number; goalsAgainst: number } | null;
}
export interface GroupMatch extends MatchScore {
  opponent: string;
}
export interface KnockoutMatch extends MatchScore {
  round: KnockoutRoundId;
  opponent: string;
}
export interface TournamentStory {
  groupPoints: number;
  groupMatches: GroupMatch[]; // always 3
  knockout: KnockoutMatch[]; // 0 after a group exit, up to 4
  outcome: string; // closing sentence
  seed: number;
}
// Shape written under rules revision 1; kept for frozen reports.
export interface LegacyTournamentStory {
  matches: string[];
  outcome: string;
  last: string;
  seed: number;
}

export interface FinalReport {
  // RULES_REVISION the report was computed under; older reports are shown as frozen history.
  rulesRevision: number;
  squadIds: PlayerId[];
  quality: number;
  chem: number;
  coverage: number;
  luck: number;
  points: number;
  stage: string;
  grade: string;
  strengths: string[];
  weak: string[];
  story: TournamentStory | LegacyTournamentStory;
}

export interface GameState {
  system: SystemId;
  stage: Stage;
  started: boolean;
  selected: Set<PlayerId>;
  campSquad: Set<PlayerId>;
  trial: Record<PlayerId, TrialReport>;
  list: ListFilters;
  events: Set<string>;
  effects: Effects;
  compare: PlayerId[];
  seed: number;
  report: FinalReport | null;
  history: GameSnapshot[];
}

export type GameSnapshot = Omit<GameState, "history" | "list">;

export type RangeId =
  | "age"
  | "score"
  | "quality"
  | "form"
  | "fitness"
  | "tactics"
  | "experience"
  | "chemistry"
  | "groupImpact"
  | "campImpact";

export interface RangeBounds {
  min: number | null;
  max: number | null;
}

// Player list view settings. They are saved with the game but never recorded as undo steps.
export interface ListFilters {
  positions: DetailedPosition[]; // empty = every position; several = any of them
  query: string;
  sort: SortId;
  foot: { left: boolean; right: boolean };
  traits: RoleId[]; // a player must have every listed trait
  ranges: Partial<Record<RangeId, RangeBounds>>;
  onlySelected: boolean;
  onlyCamp: boolean;
}

export type SortId =
  | "model"
  | "quality"
  | "form"
  | "fitness"
  | "tactics"
  | "experience"
  | "group"
  | "young"
  | "old"
  | "name";
