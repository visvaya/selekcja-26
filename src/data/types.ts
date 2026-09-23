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
export type PriorityId = "balance" | "form" | "quality";
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

interface TrialReport {
  delta: number;
  note: string;
}
export interface Effects {
  chem: number;
  fit: number;
  quality: number;
}
export interface TournamentStory {
  matches: string[];
  outcome: string;
  last: string;
  seed: number;
}

export interface FinalReport {
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
  story: TournamentStory;
}

export interface GameState {
  system: SystemId;
  priority: PriorityId;
  stage: Stage;
  started: boolean;
  selected: Set<PlayerId>;
  campSquad: Set<PlayerId>;
  trial: Record<PlayerId, TrialReport>;
  filter: "ALL" | DetailedPosition;
  query: string;
  sort: SortId;
  events: Set<string>;
  effects: Effects;
  compare: PlayerId[];
  seed: number;
  report: FinalReport | null;
  history: GameSnapshot[];
}

export type GameSnapshot = Omit<GameState, "history">;

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
