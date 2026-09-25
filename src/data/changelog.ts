// The player-facing game version and its changelog. Deliberately independent of
// APP_CONFIG.saveSchemaVersion (save shape) and RULES_REVISION (gameplay outcomes): none of the
// three is derived from another. Polish note text lives in src/ui/text.ts, keyed by version
// (see ChangelogVersion below), because src/data never carries Polish player-facing copy.
export interface ChangelogEntry {
  readonly version: string; // semver "MAJOR.MINOR.PATCH"
  readonly date: string; // ISO date "YYYY-MM-DD"
}

// Newest first.
export const CHANGELOG = [
  { version: "0.1.5", date: "2026-09-25" },
  { version: "0.1.4", date: "2026-09-25" },
  { version: "0.1.3", date: "2026-09-24" },
  { version: "0.1.2", date: "2026-09-24" },
  { version: "0.1.1", date: "2026-09-24" },
  { version: "0.1.0", date: "2026-09-23" },
] as const satisfies readonly ChangelogEntry[];

// Literal union of every changelog version, used in src/ui/text.ts to require a Polish note
// list for each entry (and to reject a note list for a version that does not exist here).
export type ChangelogVersion = (typeof CHANGELOG)[number]["version"];

export const GAME_VERSION: ChangelogVersion = CHANGELOG[0].version;
