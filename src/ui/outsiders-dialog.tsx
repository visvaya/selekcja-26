import { useId, useRef } from "react";
import type { Player, PlayerId } from "../data/types.ts";
import { CloseIcon, GameDialog } from "./game-dialog.tsx";
import { HintButton } from "./hint-button.tsx";
import { PositionBadge } from "./position-badge.tsx";
import { UI_TEXT as text } from "./text.ts";

export function OutsidersDialog({
  outsiders,
  onClose,
  onOpenProfile,
  onRemove,
  onRemoveAll,
  restoreFocusFallback,
}: {
  outsiders: Player[];
  onClose: () => void;
  onOpenProfile: (id: PlayerId) => void;
  // Commits the removal synchronously, so the next row's X can take focus right after.
  onRemove: (id: PlayerId) => void;
  onRemoveAll: () => void;
  restoreFocusFallback: () => void;
}) {
  const popoverPrefix = useId();
  const removeRefs = useRef(new Map<PlayerId, HTMLButtonElement>());

  function remove(index: number) {
    const target = outsiders[index + 1] ?? outsiders[index - 1];
    onRemove(outsiders[index]!.id);
    if (target) removeRefs.current.get(target.id)?.focus();
  }

  return (
    <GameDialog
      form="drawer"
      title={text.outOfFormationTitle(outsiders.length)}
      eyebrow={text.outOfFormationEyebrow}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      footer={
        <button className="action-button start-button" onClick={onClose}>
          {text.returnToPitch}
        </button>
      }
    >
      <p>{text.outOfFormationExplanation}</p>
      <div className="squad-list outsiders-list">
        {outsiders.map((player, index) => (
          <div className="squad-row" key={player.id}>
            <PositionBadge
              player={player}
              popoverId={`${popoverPrefix}-${player.id}`}
            />
            <span className="squad-name">
              <button
                type="button"
                className="squad-name-button"
                onClick={() => onOpenProfile(player.id)}
              >
                {player.name}
              </button>
            </span>
            <HintButton
              className="row-remove"
              label={text.playerAction(text.outsiderRemove, player.name)}
              hint={text.outsiderRemoveHint}
              onClick={() => remove(index)}
              buttonRef={(element) => {
                if (element) removeRefs.current.set(player.id, element);
                else removeRefs.current.delete(player.id);
              }}
            >
              <CloseIcon />
            </HintButton>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="action-button outsiders-remove-all"
        onClick={onRemoveAll}
      >
        {text.outsidersRemoveAllLead}{" "}
        <span className="keep-together">
          {text.outsidersRemoveAllTail(outsiders.length)}
        </span>
      </button>
    </GameDialog>
  );
}
