import type { GameState, Player, RoleId, TrialNoteId } from "../data/types.ts";
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

// The tag classes of one trait: flags warn, the camp result shows its impact's direction.
export function tagClass(trait: Trait, impact: number): string {
  if (trait.kind === "flag") return "tag alert";
  if (trait.kind === "role") return "tag";
  if (impact > 0) return "tag tag-camp camp-plus";
  if (impact < 0) return "tag tag-camp camp-minus";
  return "tag tag-camp";
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
