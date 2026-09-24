import type { CampEvent } from "../data/events.ts";
import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

export function EventDialog({
  event,
  onClose,
  onChoose,
  onUndo,
  restoreFocusFallback,
}: {
  event: CampEvent;
  onClose: () => void;
  onChoose: (index: number, choiceTitle: string) => void;
  onUndo: () => void;
  restoreFocusFallback: () => void;
}) {
  const copy = text.events[event.id];
  return (
    <GameDialog
      title={copy.title}
      eyebrow={text.eventEyebrow}
      onClose={onClose}
      blocking
      restoreFocusFallback={restoreFocusFallback}
    >
      <p>{copy.description}</p>
      {copy.choices.map((choice, index) => (
        <button
          className="decision"
          key={choice.title}
          onClick={() => onChoose(index, choice.title)}
        >
          <b>{choice.title}</b>
          <small>{choice.description}</small>
        </button>
      ))}
      <button className="action-button" onClick={onUndo}>
        {text.undo}
      </button>
    </GameDialog>
  );
}
