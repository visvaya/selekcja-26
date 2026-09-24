import type { Player, PlayerId } from "../data/types.ts";
import { positionShort } from "../logic/selection.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

export function OutsidersDialog({
  outsiders,
  onClose,
  onOpenProfile,
  restoreFocusFallback,
}: {
  outsiders: Player[];
  onClose: () => void;
  onOpenProfile: (id: PlayerId) => void;
  restoreFocusFallback: () => void;
}) {
  return (
    <GameDialog
      title={text.outOfFormationTitle(outsiders.length)}
      eyebrow={text.outOfFormationEyebrow}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
    >
      <p>{text.outOfFormationExplanation}</p>
      {outsiders.map((player) => (
        <button
          className="decision"
          key={player.id}
          onClick={() => onOpenProfile(player.id)}
        >
          <b>{player.name}</b>
          <small>
            {positionShort(player)} • {player.club}
          </small>
        </button>
      ))}
      <button className="close start-button" onClick={onClose}>
        {text.returnToPitch}
      </button>
    </GameDialog>
  );
}
