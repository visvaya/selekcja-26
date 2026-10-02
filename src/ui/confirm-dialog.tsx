import { useRef } from "react";
import { GameDialog } from "./game-dialog.tsx";

// A yes/no confirmation for an irreversible action. Focus starts on the safe choice.
export function ConfirmDialog({
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  restoreFocusFallback,
}: {
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  restoreFocusFallback: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <GameDialog
      title={title}
      eyebrow={eyebrow}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      initialFocusRef={cancelRef}
    >
      <p>{description}</p>
      <div className="confirm-actions">
        <button className="primary danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="action-button" onClick={onClose} ref={cancelRef}>
          {cancelLabel}
        </button>
      </div>
    </GameDialog>
  );
}
