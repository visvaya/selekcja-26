import { useRef } from "react";
import { GameDialog } from "./game-dialog.tsx";

type ConfirmCopy = {
  eyebrow: string;
  title: string;
  description: string;
  confirm: string;
  cancel: string;
};

// A yes/no confirmation for an irreversible action. Focus starts on the safe choice, and
// Escape cancels.
export function ConfirmDialog({
  copy,
  onConfirm,
  onClose,
  restoreFocusFallback,
}: {
  copy: ConfirmCopy;
  onConfirm: () => void;
  onClose: () => void;
  restoreFocusFallback: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <GameDialog
      role="alertdialog"
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      onClose={onClose}
      restoreFocusFallback={restoreFocusFallback}
      initialFocusRef={cancelRef}
      footer={
        <div className="confirm-actions">
          <button className="primary danger start-button" onClick={onConfirm}>
            {copy.confirm}
          </button>
          <button
            className="action-button start-button"
            onClick={onClose}
            ref={cancelRef}
          >
            {copy.cancel}
          </button>
        </div>
      }
    />
  );
}
