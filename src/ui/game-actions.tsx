import type { RefObject } from "react";
import { focusSelf } from "./focus-self.ts";
import { UI_TEXT as text } from "./text.ts";

// The four game actions: in the phone board sheet below 1024 px, in the side column above.
export function GameActions({
  canUndo,
  canAutoFill,
  canClear,
  onUndo,
  onAutoFill,
  onClear,
  onNewGame,
  undoRef,
  className,
}: {
  canUndo: boolean;
  canAutoFill: boolean;
  canClear: boolean;
  onUndo: () => void;
  onAutoFill: () => void;
  onClear: () => void;
  onNewGame: () => void;
  undoRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
}) {
  return (
    <div className={className ? `game-actions ${className}` : "game-actions"}>
      <button
        className="action-button"
        onClick={onUndo}
        disabled={!canUndo}
        ref={undoRef}
      >
        {text.undo}
      </button>
      <button
        className="action-button"
        onClick={(event) => {
          focusSelf(event);
          onAutoFill();
        }}
        disabled={!canAutoFill}
      >
        {text.autoFill}
      </button>
      <button className="action-button" onClick={onClear} disabled={!canClear}>
        {text.clearSquad}
      </button>
      <button
        className="action-button danger"
        onClick={(event) => {
          focusSelf(event);
          onNewGame();
        }}
      >
        {text.newGame}
      </button>
    </div>
  );
}
