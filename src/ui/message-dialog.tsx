import { GameDialog } from "./game-dialog.tsx";
import { UI_TEXT as text } from "./text.ts";

export function MessageDialog({
  title,
  description,
  onClose,
  restoreFocusFallback,
}: {
  title: string;
  description: string;
  onClose: () => void;
  restoreFocusFallback: () => void;
}) {
  return (
    <GameDialog
      title={title}
      eyebrow={text.notice}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
    >
      <p>{description}</p>
      <button className="primary start-button" onClick={onClose}>
        {text.understood}
      </button>
    </GameDialog>
  );
}
