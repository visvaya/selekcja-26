import type {
  AvailabilityFlagId,
  GameState,
  Player,
  RoleId,
  TrialNoteId,
} from "../data/types.ts";
import { trialImpact } from "../logic/scoring.ts";
import { UI_TEXT as text } from "./text.ts";
import { formatSignedImpact } from "./text/polish-format.ts";
import { traitOrder, type Trait } from "./trait-order.ts";

// Shared rendering rules for the tag pieces that appear on both the player strip and the profile
// dialog, so a formatting change only needs to happen in one place.

// The lead foot is a filter and a profile fact, never a tag.
const shownRoles = (roles: readonly RoleId[]): RoleId[] =>
  roles.filter((role) => role !== "leftFoot");

function campTagLabel(note: TrialNoteId, impact: number): string {
  return `${text.campResult}: ${text.trialNotes[note]} (${formatSignedImpact(impact)})`;
}

// The strip's traits in display order: the camp result (final stage only), the flag, then roles.
export function stripTraits(player: Player, state: GameState): Trait[] {
  const trial = state.stage === "final" ? state.trial[player.id] : undefined;
  const camp: Trait[] = trial
    ? [
        {
          kind: "camp",
          key: "camp",
          label: campTagLabel(trial.note, trialImpact(player, state)),
        },
      ]
    : [];
  const flag: Trait[] = player.flag
    ? [
        {
          kind: "flag",
          key: player.flag,
          label: text.availabilityFlags[player.flag],
        },
      ]
    : [];
  const roles: Trait[] = shownRoles(player.roles).map((role) => ({
    kind: "role",
    key: role,
    label: text.roles[role],
  }));
  return traitOrder([...camp, ...flag, ...roles]);
}

export function RoleTags({ roles }: { roles: RoleId[] }) {
  return (
    <>
      {shownRoles(roles).map((role) => (
        <span className="tag" key={role}>
          {text.roles[role]}
        </span>
      ))}
    </>
  );
}

export function FlagTag({ flag }: { flag: AvailabilityFlagId | null }) {
  if (!flag) return null;
  return <span className="tag alert">{text.availabilityFlags[flag]}</span>;
}

export function TrialTag({
  note,
  impact,
}: {
  note: TrialNoteId;
  impact: number;
}) {
  return (
    <span className={`tag ${impact < 0 ? "alert" : ""}`}>
      {text.campResult}: {text.trialNotes[note]} • {formatSignedImpact(impact)}
    </span>
  );
}
