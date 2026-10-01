import type { AvailabilityFlagId, RoleId, TrialNoteId } from "../data/types.ts";
import { UI_TEXT as text } from "./text.ts";
import { formatSignedImpact } from "./text/plural.ts";

// Shared rendering rules for the tag pieces that appear on both PlayerCard and the profile
// dialog, so a formatting change only needs to happen in one place.

export function RoleTags({
  roles,
  limit,
}: {
  roles: RoleId[];
  limit?: number;
}) {
  const shown = limit === undefined ? roles : roles.slice(0, limit);
  return (
    <>
      {shown.map((role) => (
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
  format,
}: {
  note: TrialNoteId;
  impact: number;
  format: "card" | "profile";
}) {
  if (format === "card")
    return (
      <span className={`tag ${impact < 0 ? "alert" : ""}`}>
        {text.campResult}: {text.trialNotes[note]} ({formatSignedImpact(impact)}
        )
      </span>
    );
  return (
    <span className={`tag ${impact < 0 ? "alert" : ""}`}>
      {text.campResult}: {text.trialNotes[note]} • {formatSignedImpact(impact)}
    </span>
  );
}
