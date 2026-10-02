import type { RefObject } from "react";
import { UI_TEXT as text } from "./text.ts";

// The four list actions, in-flow on phones and tablets, in the side column on desktop.
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
        onClick={onAutoFill}
        disabled={!canAutoFill}
      >
        {text.autoFill}
      </button>
      <button className="action-button" onClick={onClear} disabled={!canClear}>
        {text.clearSquad}
      </button>
      <button className="action-button danger" onClick={onNewGame}>
        {text.newGame}
      </button>
    </div>
  );
}
