import { useRef } from "react";
import type { Player } from "../data/types.ts";
import { detailedPositions } from "../logic/selection.ts";
import { splitName } from "./fit-name.ts";
import { POSITION_GROUP_CLASS } from "./position-badge.tsx";
import { UI_TEXT as text } from "./text.ts";
import { useFittedLabel } from "./use-fitted-label.ts";

const NAME_CLASS = "pitch-outsiders-name";

function OutsiderMagnet({ player }: { player: Player }) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const { first, last } = splitName(player.name);
  const shown = useFittedLabel(nameRef, first, last, NAME_CLASS);
  const [primary, secondary] = detailedPositions(player);
  return (
    <span className="pitch-outsiders-magnet" aria-hidden="true">
      <span className={`pos ${POSITION_GROUP_CLASS[player.pos]}`}>
        <b>{primary}</b>
        {secondary && <small>{secondary}</small>}
      </span>
      <span className={NAME_CLASS} ref={nameRef}>
        {shown}
      </span>
    </span>
  );
}

// The players outside the formation as magnets on a strip along the pitch edge; the whole
// strip is one button that opens their list.
export function PitchOutsiders({
  players,
  onOpen,
}: {
  players: Player[];
  onOpen: () => void;
}) {
  if (players.length === 0) return null;
  return (
    <button
      type="button"
      className="pitch-outsiders"
      aria-label={text.outOfFormationTitle(players.length)}
      onClick={(event) => {
        // Safari does not focus a tapped button, so the dialog would return focus to the
        // heading under the open board instead of to this button.
        event.currentTarget.focus();
        onOpen();
      }}
    >
      <span className="pitch-outsiders-label">{text.outOfFormation}</span>
      <span className="pitch-outsiders-strip">
        {players.map((player) => (
          <OutsiderMagnet key={player.id} player={player} />
        ))}
      </span>
      <svg
        className="outside-arrow"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
