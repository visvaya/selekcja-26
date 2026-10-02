import type { GroupPosition, Player } from "../data/types.ts";
import { detailedPositions } from "../logic/selection.ts";
import { UI_TEXT as text } from "./text.ts";

export const POSITION_GROUP_CLASS: Readonly<Record<GroupPosition, string>> =
  Object.freeze({
    BR: "pos-gk",
    OBR: "pos-def",
    POM: "pos-mid",
    ATA: "pos-fwd",
  });

// The strip's position magnet: the primary code, the first secondary one and "+N" for the rest.
// It opens a native popover with every position's full name; usePopoverAnchoring places it.
export function PositionBadge({
  player,
  popoverId,
}: {
  player: Player;
  popoverId: string;
}) {
  const codes = detailedPositions(player);
  const names = codes.map((code) => text.positions[code]);
  const [primary, secondary] = codes;
  const rest = codes.length - 2;
  return (
    <>
      <button
        type="button"
        className={`pos ${POSITION_GROUP_CLASS[player.pos]}`}
        popoverTarget={popoverId}
        aria-label={text.positionBadgeName(codes.join(", "), names.join(", "))}
      >
        <b>{primary}</b>
        {secondary && (
          <small>
            {secondary}
            {rest > 0 && ` ${text.positionMore(rest)}`}
          </small>
        )}
      </button>
      <div className="pos-popover" id={popoverId} popover="auto">
        <ul>
          {codes.map((code, index) => (
            <li key={code}>
              <b>{code}</b>
              {text.positionPopoverSeparator}
              {names[index]}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
